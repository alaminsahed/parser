require('dotenv').config();
const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

// Initialize Express app
const app = express();
const port = 3000;

// Set up multer for image uploads
const upload = multer({ dest: 'uploads/' });

// Initialize OpenAI API
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Route to upload an image and process it
app.post('/upload-image', upload.single('image'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No image uploaded.' });
    }

    const imagePath = path.join(__dirname, req.file.path);

    try {
        // Generate description for the uploaded image using OpenAI
        const description = await generateDescriptionWithOpenAI(imagePath);

        // Send the JSON response with image description
        res.json({
            image_url: `http://localhost:3000/${req.file.path}`,
            description,
        });

        // Clean up the uploaded image after processing
        fs.unlinkSync(imagePath);
    } catch (error) {
        console.error('Error processing image:', error);
        res.status(500).json({ error: 'Error processing the image' });
    }
});

// Function to generate description for an image using OpenAI
async function generateDescriptionWithOpenAI(imagePath) {
    try {
        const imageUrl = `http://localhost:3000/${imagePath}`; // Expose the image via HTTP (assuming local server)
        const response = await openai.chat.completions.create({
            model: 'gpt-4', // Use GPT-4 model
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: "What’s in this image?" },
                        { type: 'image_url', image_url: { url: imageUrl } },
                    ],
                },
            ],
        });

        return response.choices[0].message.content;
    } catch (error) {
        console.error('Error with OpenAI API:', error);
        throw new Error('Error generating description with OpenAI');
    }
}

// Serve uploaded images (temporary)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
