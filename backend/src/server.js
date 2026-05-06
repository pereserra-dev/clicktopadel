require("./config/env");
const app = require("./app");

const PORT = process.env.PORT || 3000;
// Codi per iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor executant-se al port ${PORT}`);
});