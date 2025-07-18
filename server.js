require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ Conectado a MongoDB Atlas"))
.catch(err => console.error("❌ Error conectando a MongoDB:", err));

const userSchema = new mongoose.Schema({
  dni: String,
  password: String,
});

const progressSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  career: String,
  states: Object,
});

const User = mongoose.model('User', userSchema);
const Progress = mongoose.model('Progress', progressSchema);

app.post('/api/register', async (req, res) => {
  try {
    const dni = String(req.body.dni);
    const password = req.body.password;

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ dni, password: hashed });

    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error en registro:', error);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const dni = String(req.body.dni);
    const password = req.body.password;

    const user = await User.findOne({ dni });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    res.json({ token });
  } catch (error) {
    console.error('❌ Error en login:', error);
    res.status(500).json({ error: 'Error al iniciar sesión' });
  }
});


app.post('/api/progress', async (req, res) => {
  try {
    const { token, career, states } = req.body;
    if (!token || !career || !states) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const { userId } = jwt.verify(token, process.env.JWT_SECRET);

    await Progress.findOneAndUpdate(
      { userId, career },
      { states },
      { upsert: true, new: true }
    );

    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error al guardar progreso:", err);
    res.status(500).json({ error: "Error al guardar progreso" });
  }
});


app.post('/api/load', async (req, res) => {
  try {
    const { token, career } = req.body;
    if (!token || !career) {
      return res.status(400).json({ error: "Faltan datos" });
    }

    const { userId } = jwt.verify(token, process.env.JWT_SECRET);
    const progress = await Progress.findOne({ userId, career });
    res.json({ states: progress?.states || {} });
  } catch (err) {
    console.error("❌ Error al cargar progreso:", err);
    res.status(500).json({ error: "Error al cargar progreso" });
  }
});


app.get('/api/ping', (req, res) => {
  res.send("pong");
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Servidor corriendo en puerto ${PORT}`));
