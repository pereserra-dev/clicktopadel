require("./config/env");
const app = require("./app");

const PORT = process.env.PORT || 8080;
// Codi per iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor executant-se al port ${PORT}`);
});