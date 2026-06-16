import express from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

export const apiRouter = express.Router();

let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing. Please add it via the Secrets panel or Environment Variables in your hosting provider.");
    }
    aiInstance = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiInstance;
}

// Helper to retry on 503/429 specifically
async function generateWithRetry(ai: GoogleGenAI, params: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await ai.models.generateContent(params);
    } catch (error: any) {
      const status = error?.status || error?.response?.status || 500;
      const isRetryable = status === 503 || status === 429 || error.message?.includes('503') || error.message?.includes('429') || error.message?.includes('high demand');
      if (!isRetryable || i === maxRetries - 1) {
        throw error;
      }
      const delay = 1000 * Math.pow(2, i);
      console.warn(`Gemini API busy (attempt ${i + 1}/${maxRetries}). Retrying in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

// Chef Nutri-Kid Master Prompt System Instructions
const ChefNutriKidPrompt = `You are NutriPeds AI (also known as Chef Nutri-Kid), an expert Pediatric Health and Nutritional AI Architect. Your role is to act as a highly knowledgeable, empathetic, and precision-driven nutritional assistant for parents. You specialize in tracking pediatric developmental metrics, evaluating weight-for-age data, and curating highly customized, allergy-safe dietary plans for children.

Your tone is highly enthusiastic, warm, encouraging, empathetic, and professional (a real "kitchen companion" for families), decorated with fun, kid-friendly emojis! You must respond in the user's requested language.

Operational Constraints and Safety Protocols:
- Zero-Tolerance Allergy Protocol: You must strictly cross-reference every suggested dish or ingredient against the child’s logged allergy profile. You will never recommend a recipe containing a known allergen or a common cross-contaminant.
- Mandatory Medical Disclaimer: All health reports and significant dietary interventions must be accompanied by a concise disclaimer stating: "NutriPeds AI provides nutritional guidance based on standard pediatric metrics, but is not a substitute for professional medical advice. Always consult your pediatrician before making significant dietary changes."
- Standardized Data Accuracy: All proactive weight-for-age analysis must be benchmarked against recognized pediatric growth standards (e.g., WHO or CDC growth charts).

Rules for your content generation:
1. Map every group of food to its corresponding Harvard Kid's Plate quadrant:
   - Vegetables & Fruits (Half-plate ratio, loaded with immunity shields and bright vision power 🥬🍎)
   - Whole Grains (Quarter-plate, the steady-energy engine charger 🌾🍞)
   - Healthy Protein (Quarter-plate, the muscle builder 🍗🫘)
   - Healthy Fats & Hydration (Engine smoothers & cold fresh water 💧🥑)
2. Include at least 2-3 interactive "Junior Assistant Chef Tasks" where kids can safely help out in the kitchen (e.g., washing, tearing, cold mixing).
3. Do not suggest deep frying or highly sugary additions. Focus on plant fats/oils (like olive oil, avocado oil, seed oils) over butter.
4. If the ingredient input is empty or says "empty fridge", kindly propose a delicious meal made of common pantry staples.
5. Calculate approximate nutritional information (Calories, Protein, Carbs, Fat, Fiber, Key Vitamins) for a standard kid's portion. Make it professional sounding.
6. When a child profile with allergies is provided, STRICTLY EXCLUDE ALLERGENS.
`;

// API endpoint for Recipe generation
apiRouter.post("/recipe", async (req, res) => {
  try {
    const { ingredients, language = "English", diet = "Any / No Restriction", childProfile } = req.body;
    if (!ingredients || typeof ingredients !== "string") {
      res.status(400).json({ error: "Ingredients must be provided as a string." });
      return;
    }

    const ai = getGeminiClient();

    let profileContext = "";
    if (childProfile) {
      profileContext = `The active child profile is for ${childProfile.name}, Age: ${childProfile.age} years, Weight: ${childProfile.weight}kg. Their dietary category is: ${childProfile.foodCategories}. Known Allergies: ${childProfile.allergies && childProfile.allergies.length > 0 ? childProfile.allergies.join(", ") : "None documented"}.
      You MUST calculate weight-for-age percentile based on standard WHO/CDC charts, determine the current nutritional trajectory (e.g. requires calories for gain, balanced macros for maintenance), and map this to specific macronutrient goals.
      STRICTLY EXCLUDE LOGGED ALLERGENS.`;
    }

    const response = await generateWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: `Great chef! Let's cook using these ingredients: "${ingredients}". The dietary preference is "${diet}". ${profileContext} Transform them into a healthy, gorgeous, kid-approved masterpiece matching this diet. Please generate the response in ${language}. Ensure the response format fits the requested Harvard Kid's Plate structure perfectly.`,
      config: {
        systemInstruction: ChefNutriKidPrompt,
        temperature: 0.8,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            recipes: {
              type: Type.ARRAY,
              description: "Provide exactly 2 highly creative, distinctly different recipe options using the given ingredients.",
              items: {
                type: Type.OBJECT,
                properties: {
                  mealName: {
                    type: Type.STRING,
                    description: "Fabulous kid-themed title with emojis (e.g. 'Captain Broccoli's Shield Sandwiches 🥦🦸‍♂️')."
                  },
                  nutritionalFocus: {
                     type: Type.STRING,
                     description: "Why it fits the current weight-for-age analysis and dietary trajectory."
                  },
                  allergyCheck: {
                     type: Type.STRING,
                     description: "Explicit confirmation of what was excluded, e.g., '100% Peanut & Dairy Free'."
                  },
                  medicalDisclaimer: {
                     type: Type.STRING,
                     description: "Mandatory medical disclaimer about professional advice."
                  },
                  plateBreakdown: {
                    type: Type.OBJECT,
                    properties: {
                      fruitsVeggies: {
                        type: Type.STRING,
                        description: "Explain how fruits/veg map to 50% of the plate and what power they give (e.g. eye power or custom immunity shield, decorated with emojis)."
                      },
                      wholeGrains: {
                        type: Type.STRING,
                        description: "Explain the whole grain source (25% energy module) and why it keeps our engines running forever, with emojis."
                      },
                      strongProtein: {
                        type: Type.STRING,
                        description: "Explain the healthy protein (25% muscle builder) and how it creates strong arms/legs, with emojis."
                      },
                      fatsHydrates: {
                        type: Type.STRING,
                        description: "Healthy fats used (e.g., olive oil) and cheerful hydration suggestions, with emojis."
                      }
                    },
                    required: ["fruitsVeggies", "wholeGrains", "strongProtein", "fatsHydrates"]
                  },
                  instructions: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "Detailed, easy step-by-step cooking steps. Maximum 6 clear steps, easy for parents."
                  },
                  juniorDuties: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING },
                    description: "2-3 fun interactive junior tasks (e.g. 'Tear the spinach leaves into tiny bites', 'Mix the sauce with a spoon!')."
                  },
                  powerMealFact: {
                    type: Type.STRING,
                    description: "A super encouraging scientific fact told in very cute kid terms (e.g. 'Beta-carotene in carrots is like Night Vision Goggles!')."
                  },
                  moveChallenge: {
                    type: Type.STRING,
                    description: "A fun 15-second physical challenge related to the food theme (e.g. 'Do 10 Star Jumps to fire up your digestive engine before the first bite!')."
                  },
                  tutorialQuery: {
                    type: Type.STRING,
                    description: "Exact search term to find a tutorial video (e.g., 'kids healthy brown rice bowl recipe tutorial')."
                  },
                  dietIndicator: {
                    type: Type.STRING,
                    description: "A short indicator of the recipe's diet type with an emoji (e.g., '🟢 Pure Veg', '🔴 Non-Veg', '🥚 Eggetarian', '🌱 Vegan', '🧄 Jain')."
                  },
                  nutrition: {
                    type: Type.OBJECT,
                    properties: {
                      calories: { type: Type.INTEGER, description: "Total calories for a kid's portion" },
                      protein: { type: Type.STRING, description: "Protein amount (e.g., '15g')" },
                      carbs: { type: Type.STRING, description: "Carbohydrates amount (e.g., '30g')" },
                      fat: { type: Type.STRING, description: "Healthy fats amount (e.g., '10g')" },
                      fiber: { type: Type.STRING, description: "Fiber amount (e.g., '8g')" },
                      keyVitamins: { type: Type.STRING, description: "Key vitamins provided (e.g., 'Vitamin A, C, Iron')" }
                    },
                    required: ["calories", "protein", "carbs", "fat", "fiber", "keyVitamins"]
                  }
                },
                required: [
                  "mealName",
                  "medicalDisclaimer",
                  "plateBreakdown",
                  "instructions",
                  "juniorDuties",
                  "powerMealFact",
                  "moveChallenge",
                  "tutorialQuery",
                  "dietIndicator",
                  "nutrition"
                ]
              }
            }
          },
          required: ["recipes"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response string received from the Gemini clinical culinary engine.");
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Gemini culinary engine error:", error);
    let errorMessage = error.message || "Something went wrong in Chef Nutri-Kid's kitchen!";
    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
      errorMessage = "API Rate Limit Exceeded: The AI Chef has run out of daily free quota. Please try again tomorrow or use an upgraded API key.";
    } else if (errorMessage.includes("503") || errorMessage.includes("high demand")) {
      errorMessage = "The AI Chef's kitchen is currently experiencing high demand! Please try again in a moment.";
    }
    res.status(500).json({
      error: errorMessage,
    });
  }
});

// API endpoint for scanning ingredients from image
apiRouter.post("/scan-ingredients", async (req, res) => {
  try {
    const { imageBase64, mimeType = "image/jpeg" } = req.body;
    if (!imageBase64) {
      res.status(400).json({ error: "Image data must be provided." });
      return;
    }

    const ai = getGeminiClient();

    const response = await generateWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: [
        {
          role: "user",
          parts: [
            { text: "Identify the food ingredients in this image. Return a JSON array of strings representing the names of the ingredients. Use simple, common names (e.g. 'Apple', 'Oats', 'Broccoli', 'Eggs'). Ignore non-food items. If no food is found, return an empty array." },
            { 
              inlineData: {
                data: imageBase64,
                mimeType: mimeType
              }
            }
          ]
        }
      ],
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text;
    if (!text) {
        throw new Error("No response string received from the Gemini clinical culinary engine.");
    }
    
    res.json({ ingredients: JSON.parse(text) });
  } catch (error: any) {
    console.error("Gemini scan engine error:", error);
    let errorMessage = error.message || "Something went wrong scanning your image!";
    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
      errorMessage = "API Rate Limit Exceeded: The AI Chef has run out of daily free quota. Please try again tomorrow or use an upgraded API key.";
    } else if (errorMessage.includes("503") || errorMessage.includes("high demand")) {
      errorMessage = "The AI Chef's kitchen is currently experiencing high demand! Please try again in a moment.";
    }
    res.status(500).json({
      error: errorMessage,
    });
  }
});

// API endpoint for Health Report generation
apiRouter.post("/health-report", async (req, res) => {
  try {
    const { childProfile, language = "English" } = req.body;
    if (!childProfile) {
      res.status(400).json({ error: "Child profile must be provided." });
      return;
    }

    const ai = getGeminiClient();

    const prompt = `Generate a Creative Child Health Report for Phase 4 of the NutriPeds AI workflow.
    Child Data: Name: ${childProfile.name}, Age: ${childProfile.age} years, Weight: ${childProfile.weight}kg, Diet: ${childProfile.foodCategories}, Allergies: ${childProfile.allergies && childProfile.allergies.length > 0 ? childProfile.allergies.join(", ") : "None"}.
    Language: ${language}.
    Please analyze their weight-for-age trajectory based on standard benchmarks and output a comprehensive, creatively formatted report adhering strictly to the constraints.`;

    const response = await generateWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: ChefNutriKidPrompt,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            childName: { type: Type.STRING },
            medicalDisclaimer: { type: Type.STRING, description: "Mandatory medical disclaimer about professional advice." },
            healthSummary: { type: Type.STRING, description: "A brief, encouraging overview of the child's current health status." },
            growthChartAnalysis: { type: Type.STRING, description: "A simple visual representation or clear text summary of where the child stands developmentally according to international standards." },
            proactivePlateStrategy: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Top 3 nutritional focus areas for the upcoming period based on the analysis." },
            allergySafetyShield: { type: Type.STRING, description: "A highlighted box reaffirming the specific ingredients being strictly avoided for safety." },
            milestoneTracker: { type: Type.STRING, description: "A creative summary of the child's expected energy levels and developmental milestones supported by the current plan." }
          },
          required: ["childName", "medicalDisclaimer", "healthSummary", "growthChartAnalysis", "proactivePlateStrategy", "allergySafetyShield", "milestoneTracker"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response string received from the Gemini engine.");

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Gemini health report engine error:", error);
    let errorMessage = error.message || "Something went wrong generating the health report!";
    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
      errorMessage = "API Rate Limit Exceeded: The AI Chef has run out of daily free quota. Please try again tomorrow or use an upgraded API key.";
    } else if (errorMessage.includes("503") || errorMessage.includes("high demand")) {
      errorMessage = "The AI Chef's kitchen is currently experiencing high demand! Please try again in a moment.";
    }
    res.status(500).json({ error: errorMessage });
  }
});

// API endpoint for Weekly Meal Plan generation
apiRouter.post("/weekly-plan", async (req, res) => {
  try {
    const { ageGroup, language = "English", diet = "Any / No Restriction", childProfile } = req.body;
    if (!ageGroup && !childProfile) {
      res.status(400).json({ error: "Age group or child profile must be provided." });
      return;
    }

    const ai = getGeminiClient();

    let profileContext = "";
    if (childProfile) {
      profileContext = `The plan is specifically for ${childProfile.name}, Age: ${childProfile.age} years, Weight: ${childProfile.weight}kg. Their dietary category is: ${childProfile.foodCategories}. Known Allergies: ${childProfile.allergies && childProfile.allergies.length > 0 ? childProfile.allergies.join(", ") : "None documented"}.
      STRICTLY EXCLUDE LOGGED ALLERGENS inside ALL days and snacks.`;
    }

    const prompt = `You are a professional pediatric dietitian and "Chef Nutri-Kid".
Please create a professional weekly healthy meal chart (7 days) for a child.
${childProfile ? profileContext : `Age group: ${ageGroup}.`}
The dietary preference is: ${childProfile ? childProfile.foodCategories : diet}. Ensure all meals strictly adhere to this dietary restriction.
Adhere to the Harvard Kid's Healthy Eating Plate guidelines.
Please generate the response in ${language}.
${childProfile ? `IMPORTANT: Set the "title" field to exactly: "${childProfile.name.toUpperCase()} MEAL REPORT"` : ''}
Return a structured weekly meal plan and a concise grocery shopping list. Ensure professional formatting and accurate language translation.`;

    const response = await generateWithRetry(ai, {
      model: "gemini-3.1-flash-lite",
      contents: prompt,
      config: {
        systemInstruction: ChefNutriKidPrompt,
        temperature: 0.7,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING, description: "Professional title for the weekly plan" },
            tips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 professional nutrition tips for this age group" },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.STRING, description: "Name of the day (e.g., Monday)" },
                  breakfast: { type: Type.STRING },
                  lunch: { type: Type.STRING },
                  dinner: { type: Type.STRING },
                  snacks: { type: Type.STRING },
                  powerFact: { type: Type.STRING, description: "Short nutritional fact about this day's meals" }
                },
                required: ["day", "breakfast", "lunch", "dinner", "snacks", "powerFact"]
              }
            },
            shoppingList: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Categorized shopping list items" }
          },
          required: ["title", "tips", "days", "shoppingList"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response string received from the Gemini clinical culinary engine.");
    }

    res.json(JSON.parse(text));
  } catch (error: any) {
    console.error("Gemini weekly chart engine error:", error);
    let errorMessage = error.message || "Something went wrong generating the weekly chart!";
    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
      errorMessage = "API Rate Limit Exceeded: The AI Chef has run out of daily free quota. Please try again tomorrow or use an upgraded API key.";
    } else if (errorMessage.includes("503") || errorMessage.includes("high demand")) {
      errorMessage = "The AI Chef's kitchen is currently experiencing high demand! Please try again in a moment.";
    }
    res.status(500).json({
      error: errorMessage,
    });
  }
});
