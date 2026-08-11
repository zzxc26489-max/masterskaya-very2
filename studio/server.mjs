import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const seedPath = path.join(dataDir, "content.seed.json");
const localPath = path.join(dataDir, "content.local.json");
const isProduction = process.env.NODE_ENV === "production";
const useLocalContent = process.env.STUDIO_CONTENT_MODE !== "seed";
const port = Number(process.env.PORT || 4173);
const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? "" : "vera-demo");
const sessionSecret = process.env.SESSION_SECRET || (isProduction ? "" : "local-studio-secret-change-before-production");
const sessionLifetime = 1000 * 60 * 60 * 12;

if (isProduction && (!adminPassword || !sessionSecret)) {
  throw new Error("Для production задайте ADMIN_PASSWORD и SESSION_SECRET в окружении.");
}

let content;
let saveQueue = Promise.resolve();

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function loadContent() {
  if (useLocalContent) {
    try {
      return await readJson(localPath);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  const seed = await readJson(seedPath);
  if (useLocalContent) await persist(seed);
  else content = seed;
  return seed;
}

function persist(next) {
  content = next;
  if (!useLocalContent) return Promise.resolve();
  saveQueue = saveQueue.then(async () => {
    await fs.mkdir(dataDir, { recursive: true });
    const temporary = `${localPath}.${process.pid}.tmp`;
    await fs.writeFile(temporary, `${JSON.stringify(content, null, 2)}\n`, "utf8");
    await fs.rename(temporary, localPath);
  });
  return saveQueue;
}

function id(prefix) {
  return `${prefix}_${crypto.randomBytes(7).toString("hex")}`;
}

function cookieValue(request, name) {
  const header = request.headers.cookie || "";
  return header.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`))?.slice(name.length + 1);
}

function sign(value) {
  return crypto.createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function createSession() {
  const issuedAt = Date.now().toString();
  return `${issuedAt}.${sign(issuedAt)}`;
}

function validSession(token) {
  if (!token) return false;
  const [issuedAt, signature] = token.split(".");
  const received = Buffer.from(signature || "");
  const expected = Buffer.from(sign(issuedAt || ""));
  if (!issuedAt || received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) return false;
  return Date.now() - Number(issuedAt) < sessionLifetime;
}

function setSession(response, token) {
  const attributes = [
    `mv_admin=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${Math.floor(sessionLifetime / 1000)}`
  ];
  if (isProduction) attributes.push("Secure");
  response.setHeader("Set-Cookie", attributes.join("; "));
}

function clearSession(response) {
  response.setHeader("Set-Cookie", "mv_admin=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

function requireAdmin(request, response, next) {
  if (!validSession(cookieValue(request, "mv_admin"))) {
    return response.status(401).json({ error: "Нужно войти в админку." });
  }
  next();
}

function safeText(value, max = 4000) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function safeArray(value, max = 30) {
  return Array.isArray(value) ? value.map((item) => safeText(item, 500)).filter(Boolean).slice(0, max) : [];
}

function safeSlug(value) {
  return safeText(value, 70).toLowerCase().replace(/[^a-z0-9а-яё-]+/gi, "-").replace(/^-+|-+$/g, "");
}

function normaliseResident(payload, previous = {}) {
  const allowedAvailability = ["available", "in-progress", "archive", "reserved"];
  const allowedTechnique = ["one-of-a-kind", "author-series"];
  const availability = allowedAvailability.includes(payload.availability) ? payload.availability : (previous.availability || "archive");
  const technique = allowedTechnique.includes(payload.technique) ? payload.technique : (previous.technique || "one-of-a-kind");
  return {
    ...previous,
    id: previous.id || id("resident"),
    slug: safeSlug(payload.slug || previous.slug || payload.name) || previous.slug || id("resident"),
    name: safeText(payload.name || previous.name, 120),
    shortName: safeText(payload.shortName || previous.shortName, 80),
    collectionId: safeText(payload.collectionId || previous.collectionId, 80),
    availability,
    technique,
    type: safeText(payload.type || previous.type, 120),
    character: safeText(payload.character || previous.character, 300),
    habitat: safeText(payload.habitat || previous.habitat, 300),
    excerpt: safeText(payload.excerpt || previous.excerpt, 500),
    story: safeText(payload.story || previous.story, 5000),
    creationDate: safeText(payload.creationDate || previous.creationDate, 40),
    heroImage: safeText(payload.heroImage || previous.heroImage, 300),
    gallery: safeArray(payload.gallery || previous.gallery, 20),
    tags: safeArray(payload.tags || previous.tags, 12),
    chronicle: {
      origin: safeText(payload.chronicle?.origin || previous.chronicle?.origin, 700),
      character: safeText(payload.chronicle?.character || previous.chronicle?.character, 700),
      path: safeText(payload.chronicle?.path || previous.chronicle?.path, 700),
      keeper: safeText(payload.chronicle?.keeper || previous.chronicle?.keeper, 120)
    },
    updatedAt: new Date().toISOString()
  };
}

function normaliseCollection(payload, previous = {}) {
  const allowedThemes = ["winter", "forest", "dragons", "russian", "home"];
  return {
    ...previous,
    id: previous.id || id("collection"),
    slug: safeSlug(payload.slug || previous.slug || payload.name) || previous.slug || id("collection"),
    name: safeText(payload.name || previous.name, 120),
    title: safeText(payload.title || previous.title, 180),
    description: safeText(payload.description || previous.description, 700),
    theme: allowedThemes.includes(payload.theme) ? payload.theme : (previous.theme || "dragons"),
    image: safeText(payload.image || previous.image, 300),
    accent: safeText(payload.accent || previous.accent, 32),
    updatedAt: new Date().toISOString()
  };
}

function normaliseStory(payload, previous = {}) {
  return {
    ...previous,
    id: previous.id || id("story"),
    title: safeText(payload.title || previous.title, 180),
    lead: safeText(payload.lead || previous.lead, 600),
    body: safeText(payload.body || previous.body, 6000),
    quote: safeText(payload.quote || previous.quote, 700),
    image: safeText(payload.image || previous.image, 300),
    published: payload.published === false ? false : true,
    updatedAt: new Date().toISOString()
  };
}

function findById(items, key) {
  return items.findIndex((item) => item.id === key || item.slug === key);
}

function publicContent() {
  const { inquiries, ...visible } = content;
  return { ...visible, stories: visible.stories.filter((story) => story.published) };
}

function uploadFolder(request) {
  const raw = safeText(request.query.folder || "unsorted", 120);
  return raw.split("/").map(safeSlug).filter(Boolean).join("/") || "unsorted";
}

const storage = multer.diskStorage({
  destination: async (request, file, callback) => {
    try {
      const folder = uploadFolder(request);
      const target = path.join(publicDir, "media", "uploads", folder);
      await fs.mkdir(target, { recursive: true });
      callback(null, target);
    } catch (error) {
      callback(error);
    }
  },
  filename: (request, file, callback) => {
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".jpg";
    const base = safeSlug(path.basename(file.originalname, path.extname(file.originalname))) || "photo";
    callback(null, `${base}-${Date.now()}-${crypto.randomBytes(3).toString("hex")}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 120 * 1024 * 1024, files: 20 },
  fileFilter: (request, file, callback) => callback(null, /^(image\/(jpeg|png|webp|gif|avif)|video\/(mp4|quicktime|webm))$/i.test(file.mimetype))
});

const app = express();
app.disable("x-powered-by");
app.use(express.json({ limit: "1mb" }));

app.get("/api/content", (request, response) => response.json(publicContent()));
app.get("/api/auth/me", (request, response) => response.json({ authenticated: validSession(cookieValue(request, "mv_admin")) }));
app.post("/api/auth/login", (request, response) => {
  const password = safeText(request.body?.password, 500);
  const expected = Buffer.from(adminPassword || "missing-password");
  const received = Buffer.from(password);
  const matches = expected.length === received.length && crypto.timingSafeEqual(expected, received);
  if (!matches) return response.status(401).json({ error: "Пароль не подошёл." });
  setSession(response, createSession());
  response.json({ authenticated: true });
});
app.post("/api/auth/logout", (request, response) => {
  clearSession(response);
  response.status(204).end();
});

app.post("/api/inquiries", async (request, response) => {
  const name = safeText(request.body?.name, 120);
  const contact = safeText(request.body?.contact, 250);
  const message = safeText(request.body?.message, 3000);
  if (!name || !contact || !message) return response.status(422).json({ error: "Заполните имя, способ связи и идею Жителя." });
  content.inquiries.unshift({ id: id("inquiry"), name, contact, message, status: "new", createdAt: new Date().toISOString() });
  await persist(content);
  response.status(201).json({ ok: true });
});

app.use("/api", requireAdmin);
app.get("/api/admin/content", (request, response) => response.json(content));
app.put("/api/settings", async (request, response) => {
  content.settings = {
    ...content.settings,
    brand: safeText(request.body?.brand || content.settings.brand, 120),
    tagline: safeText(request.body?.tagline || content.settings.tagline, 300),
    contactNote: safeText(request.body?.contactNote || content.settings.contactNote, 1000)
  };
  await persist(content);
  response.json(content.settings);
});

app.post("/api/residents", async (request, response) => {
  const resident = normaliseResident(request.body || {});
  if (!resident.name || !resident.collectionId) return response.status(422).json({ error: "Укажите имя Жителя и коллекцию." });
  if (content.residents.some((item) => item.slug === resident.slug)) return response.status(409).json({ error: "Такой адрес Жителя уже есть." });
  content.residents.unshift(resident);
  await persist(content);
  response.status(201).json(resident);
});
app.put("/api/residents/:key", async (request, response) => {
  const index = findById(content.residents, request.params.key);
  if (index < 0) return response.status(404).json({ error: "Житель не найден." });
  const next = normaliseResident(request.body || {}, content.residents[index]);
  const collision = content.residents.some((item, itemIndex) => itemIndex !== index && item.slug === next.slug);
  if (collision) return response.status(409).json({ error: "Такой адрес Жителя уже есть." });
  content.residents[index] = next;
  await persist(content);
  response.json(next);
});
app.delete("/api/residents/:key", async (request, response) => {
  const index = findById(content.residents, request.params.key);
  if (index < 0) return response.status(404).json({ error: "Житель не найден." });
  content.residents.splice(index, 1);
  await persist(content);
  response.status(204).end();
});

app.post("/api/collections", async (request, response) => {
  const collection = normaliseCollection(request.body || {});
  if (!collection.name) return response.status(422).json({ error: "Укажите название коллекции." });
  content.collections.push(collection);
  await persist(content);
  response.status(201).json(collection);
});
app.put("/api/collections/:key", async (request, response) => {
  const index = findById(content.collections, request.params.key);
  if (index < 0) return response.status(404).json({ error: "Коллекция не найдена." });
  content.collections[index] = normaliseCollection(request.body || {}, content.collections[index]);
  await persist(content);
  response.json(content.collections[index]);
});
app.delete("/api/collections/:key", async (request, response) => {
  const index = findById(content.collections, request.params.key);
  if (index < 0) return response.status(404).json({ error: "Коллекция не найдена." });
  const collection = content.collections[index];
  if (content.residents.some((resident) => resident.collectionId === collection.id)) return response.status(409).json({ error: "Сначала перенесите или удалите Жителей из этой коллекции." });
  content.collections.splice(index, 1);
  await persist(content);
  response.status(204).end();
});

app.post("/api/stories", async (request, response) => {
  const story = normaliseStory(request.body || {});
  if (!story.title) return response.status(422).json({ error: "Укажите заголовок истории." });
  content.stories.unshift(story);
  await persist(content);
  response.status(201).json(story);
});
app.put("/api/stories/:key", async (request, response) => {
  const index = findById(content.stories, request.params.key);
  if (index < 0) return response.status(404).json({ error: "История не найдена." });
  content.stories[index] = normaliseStory(request.body || {}, content.stories[index]);
  await persist(content);
  response.json(content.stories[index]);
});
app.delete("/api/stories/:key", async (request, response) => {
  const index = findById(content.stories, request.params.key);
  if (index < 0) return response.status(404).json({ error: "История не найдена." });
  content.stories.splice(index, 1);
  await persist(content);
  response.status(204).end();
});

app.get("/api/inquiries", (request, response) => response.json(content.inquiries));
app.put("/api/inquiries/:key", async (request, response) => {
  const index = findById(content.inquiries, request.params.key);
  if (index < 0) return response.status(404).json({ error: "Заявка не найдена." });
  content.inquiries[index].status = ["new", "in-progress", "answered", "archived"].includes(request.body?.status) ? request.body.status : content.inquiries[index].status;
  await persist(content);
  response.json(content.inquiries[index]);
});

app.post("/api/media", upload.array("files", 20), (request, response) => {
  const folder = uploadFolder(request);
  const files = (request.files || []).map((file) => ({
    name: file.originalname,
    url: `/media/uploads/${folder}/${file.filename}`,
    size: file.size,
    type: file.mimetype
  }));
  response.status(201).json({ files });
});

app.use(express.static(publicDir, { extensions: ["html"], maxAge: isProduction ? "1h" : 0 }));
app.get("/admin", (request, response) => response.sendFile(path.join(publicDir, "admin", "index.html")));
app.get("/*splat", (request, response) => response.status(404).sendFile(path.join(publicDir, "404.html")));

content = await loadContent();
app.listen(port, () => {
  console.log(`Мастерская Веры запущена: http://localhost:${port}`);
  if (!isProduction && process.env.ADMIN_PASSWORD === undefined) console.log("Локальный пароль админки: vera-demo (обязательно сменить перед публикацией)");
});
