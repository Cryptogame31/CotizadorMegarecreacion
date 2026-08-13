const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Servir archivos estáticos de la aplicación
app.use(express.static(path.join(__dirname, 'public')));

// Redirigir cualquier petición al index.html para soportar el enrutado de la SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Servidor local de Megarecreación activo en: http://localhost:${PORT}`);
});
