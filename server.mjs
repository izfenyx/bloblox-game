import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Permitir la política de seguridad para que Discord no bloquee la app
app.use((req, res, next) => {
    res.setHeader(
        "Content-Security-Policy",
        "default-src * 'unsafe-inline' 'unsafe-eval' data: blob:; connect-src * 'unsafe-inline' https://ai.blobloxsupport.online wss:;"
    );
    next();
});

app.use(express.static(__dirname));

const GEMINI_API_KEY = "AQ.Ab8RN6I7SqGH8iUD-VX5hovVLVqnzUj6Qb5eKf1Ezv8aBrcOlQ";
let chatHistory = [];

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Mensaje vacío' });

        chatHistory.push({
            role: "user",
            parts: [{ text: message }]
        });

        if (chatHistory.length > 10) {
            chatHistory = chatHistory.slice(chatHistory.length - 10);
        }

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${GEMINI_API_KEY}`;

        const bodyPayload = {
            system_instruction: {
                parts: [{ text: "Eres Bloblox IA, una asistente virtual femenina, amigable y experta en tecnología y videojuegos, integrada en Discord. Responde de forma breve y natural." }]
            },
            contents: chatHistory
        };

        const apiResponse = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bodyPayload)
        });

        const data = await apiResponse.json();

        if (!apiResponse.ok) {
            console.error("Error de la API de Google:", data);
            return res.status(500).json({ error: data.error?.message || "Google rechazó la conexión." });
        }

        const aiResponseText = data.candidates[0].content.parts[0].text;

        chatHistory.push({
            role: "model",
            parts: [{ text: aiResponseText }]
        });

        // Respondemos directamente con el texto y memoria intactos, evitando que Railway crashee generando archivos de audio locales
        res.json({
            text: aiResponseText,
            audioBase64: null
        });

    } catch (error) {
        console.error("ERROR CRÍTICO:", error);
        res.status(500).json({ error: "Falló el servidor.", details: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Servidor de Bloblox IA con Gemini activo en el puerto ${PORT}`);
});
