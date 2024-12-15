import express from "express";
import multer from "multer";
import fs from "fs";
import path from "path";
import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

// Initialize OpenAI API client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Set up Express app
const app = express();
const PORT = 5000;

// Configure multer for file uploads
const upload = multer({ dest: "uploads/" });

// Helper function to convert image to Base64
function encodeImageToBase64(imagePath) {
    const image = fs.readFileSync(imagePath);
    return image.toString("base64");
}

// Helper function to extract JSON content from OpenAI response
function extractJson(responseContent) {
    const jsonStart = responseContent.indexOf("```json") + 7; // Skip "```json"
    const jsonEnd = responseContent.lastIndexOf("```");
    const jsonString = responseContent.slice(jsonStart, jsonEnd).trim(); // Extract JSON part
    return JSON.parse(jsonString); // Parse JSON
}

// Function to process images with OpenAI
async function processImages(imagePaths) {
    const imageMessages = imagePaths.map((imagePath) => {
        const base64Image = encodeImageToBase64(imagePath);
        return {
            type: "image_url",
            image_url: {
                url: `data:image/jpeg;base64,${base64Image}`, // Construct Base64 Data URL
            },
        };
    });

    const messages = [
        {
            role: "user",
            content: [
                { type: "text", text: "What is in these images? Can you provide JSON data for them?" },
                ...imageMessages,
            ],
        },
    ];

    const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: messages,
    });

    const rawContent = response.choices[0].message.content;

    // Extract and clean up the JSON content
    try {
        return extractJson(rawContent);
    } catch (error) {
        console.error("Failed to parse JSON from OpenAI response:", error);
        throw new Error("Invalid JSON format in OpenAI response");
    }
}

// API endpoint to upload images
app.post("/upload", upload.array("images", 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: "No files uploaded" });
        }

        // Get uploaded file paths
        const imagePaths = req.files.map((file) => file.path);

        // Process images with OpenAI
        const cleanedJsonResponse = await processImages(imagePaths);

        // Clean up uploaded files
        req.files.forEach((file) => fs.unlinkSync(file.path));

        // Respond with cleaned JSON data
        res.status(200).json({ data: cleanedJsonResponse });
    } catch (error) {
        console.error("Error processing images:", error);
        res.status(500).json({ error: "Failed to process images" });
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
