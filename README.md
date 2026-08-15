# Chatbot de WhatsApp BLAK

Backend de atención automática para WhatsApp Business con OpenAI y PostgreSQL.

## Uso local

```bash
npm install
npm run db:bootstrap
npm start
```

## Endpoints

- `GET /health`
- `GET|POST /webhook/whatsapp`
- `GET /` panel administrativo
- `GET /panel` costos

## Base de datos

El chatbot utiliza exclusivamente el esquema PostgreSQL `blak_chatbot`.
No modifica el esquema `public` empleado por reservas y booking.

## Documentación

- [Operación](docs/OPERACION.md)
- [Costos](docs/COSTOS.md)

## Seguridad

Las variables de entorno contienen las credenciales. Nunca se suben tokens,
contraseñas ni URLs con credenciales al repositorio.
