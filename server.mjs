import express from 'express';
import cors from 'cors';
import gTTS from 'gtts';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// Pega aquí tu clave gratuita de Google AI Studio (Gemini)
const GEMINI_API_KEY = "AQ.Ab8RN6I7SqGH8iUD-VX5hovVLVqnzUj6Qb5eKf1Ezv8aBrcOlQ";

app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        if (!message) return res.status(400).json({ error: 'Mensaje vacío' });

        // Usamos el modelo estable actual exigido por la API de Google
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${GEMINI_API_KEY}`;

        const bodyPayload = {
            system_instruction: {
                parts: [{ text: "Eres Bloblox IA, una asistente virtual femenina, amigable y experta en tecnología y videojuegos, integrada en Discord. Responde de forma breve y natural." }]
            },
            contents: [
                {
                    role: "user",
                    parts: [{ text: message }]
                }
            ]
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

        // --- FILTRO INTELIGENTE PARA EL AUDIO ---
        // Elimina emojis y markdown para que la voz no lea símbolos raros ni "emoji de..."
        const textForSpeech = aiResponseText
            .replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD00-\uDDFF])/g, '')
            .replace(/[*_`#]/g, '')
            .trim();

        // 2. Generar el archivo de audio externo con gTTS usando el texto limpio
        const audioFileName = `voice_${Date.now()}_${Math.random().toString(36).substring(7)}.mp3`;
        const audioFilePath = path.join(__dirname, audioFileName);

        const speech = new gTTS(textForSpeech, 'es');

        await new Promise((resolve, reject) => {
            speech.save(audioFilePath, (err, result) => {
                if (err) reject(err);
                else resolve(result);
            });
        });

        // 3. Leer el MP3 generado, pasarlo a Base64 y limpiar el archivo local
        const audioBuffer = fs.readFileSync(audioFilePath);
        const audioBase64 = `data:audio/mp3;base64,${audioBuffer.toString('base64')}`;

        if (fs.existsSync(audioFilePath)) {
            fs.unlinkSync(audioFilePath);
        }

        // 4. Enviar respuesta final al frontend (Texto completo con emojis + Audio limpio)
        res.json({
            text: aiResponseText,
            audioBase64: audioBase64
        });

    } catch (error) {
        console.error("ERROR CRÍTICO:", error);
        res.status(500).json({ error: "Falló el servidor.", details: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor de Bloblox IA con Gemini activo en el puerto ${PORT}`);
});
