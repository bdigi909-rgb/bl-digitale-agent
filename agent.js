require('dotenv').config();
const express = require('express');
const Groq = require('groq-sdk');

const app = express();
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const conversations = new Map();

const SYSTEM_PROMPT = `
Tu es l'assistant commercial de BL Digitale, agence web & automatisation basée au Maroc.
Tu t'appelles "Bilal IA" et tu représentes l'agence de manière professionnelle.

LANGUE : Réponds dans la même langue que le client (darija, français, anglais, arabe classique).
STYLE  : Professionnel, chaleureux, direct. Maximum 4 phrases par message.

SERVICES BL DIGITALE :
- Création de sites web (vitrine, e-commerce, landing page)
- Référencement SEO Google
- Automatisation WhatsApp & CRM
- Publicité Google Ads / Meta Ads

RÈGLES :
- Si le client demande un prix → propose un appel gratuit
- Si prospect chaud → propose directement un rendez-vous
- Ne jamais inventer de prix fixes
- Toujours terminer par une question
`.trim();

app.post('/webhook', async (req, res) => {
  try {
    const { contact, message } = req.body;

    if (!message || !contact) {
      return res.status(400).json({ error: 'Paramètres manquants' });
    }

    // Historique par contact
    if (!conversations.has(contact)) conversations.set(contact, []);
    const history = conversations.get(contact);
    history.push({ role: 'user', content: message });

    // Appel Groq
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 400,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...history
      ]
    });

    const reply = response.choices[0].message.content.trim();
    history.push({ role: 'assistant', content: reply });

    // Garder max 30 messages
    if (history.length > 30) history.splice(0, 2);

    console.log(`[${contact}] → ${reply.substring(0, 60)}...`);
    res.json({ reply });

  } catch (err) {
    console.error('Erreur:', err.message);
    res.status(500).json({ reply: 'Désolé, une erreur est survenue. Notre équipe vous contacte bientôt. _BL Digitale_' });
  }
});

app.get('/', (req, res) => res.send('BL Digitale Agent — Online ✅'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Agent BL Digitale actif sur port ${PORT}`));