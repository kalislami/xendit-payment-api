# Xendit Payment API

RESTful API sederhana untuk membuat invoice menggunakan Xendit dan menerima callback invoice status. Dibangun dengan Express + TypeScript, Prisma ORM, PostgreSQL, dan siap dijalankan dengan Docker.

## Teknologi

- Node.js + TypeScript
- Express.js
- Prisma ORM
- PostgreSQL
- Docker & Docker Compose
- Mocha + Chai + Supertest (unit testing)
- Swagger

---

### Generate Prisma Client

```bash
npx prisma generate
```

### Jalankan migrasi

```bash
npx prisma migrate dev --name init
```

---

## Menjalankan Aplikasi

### Dengan Docker

```bash
docker-compose up --build
```

Layanan akan tersedia di: `http://localhost:3000`

### Tanpa Docker (lokal)

```bash
npm run dev
```

---

## 📦 Struktur Folder

```
src/
├── app.ts                  # setup express
├── server.ts               # entrypoint
├── swagger.ts              # config swagger
├── routes/
│   └── payment.route.ts    # endpoint logic
├── services/
│   └── prisma.service.ts   # Prisma instance
├── validation/
│   └── *.ts                # validasi input
├── generated/
│   └── prisma/             # hasil prisma generate (copy saat build)
test/
├── invoice.test.ts         # unit test endpoint /create-invoice
└── webhook.test.ts         # unit test endpoint /invoice-callback
prisma/
├── schema.prisma           # Prisma schema
└── migrations/             # folder migrasi prisma
```

---

## 🧪 Menjalankan Unit Test

```bash
npm test
```

Test dilakukan menggunakan Mocha + Chai + Supertest. Callback Xendit dimock menggunakan `sinon`.

---

## 🛠 Build (Production)

```bash
npm run build
```

## ✨ Credits

Dibuat oleh Kamal sebagai latihan integrasi pembayaran menggunakan Xendit dengan best practices REST API dan testing.

```