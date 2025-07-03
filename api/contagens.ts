import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Storage } from './_storage';
import { insertContagemSchema } from "@shared/schema";
import { z } from "zod";

const storage = new Storage();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Responder a requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET /api/contagens
  if (req.method === 'GET') {
    try {
      const contagens = await storage.getContagens();
      return res.json(contagens);
    } catch (error) {
      console.error("Error fetching contagens:", error);
      return res.status(500).json({ message: "Erro ao buscar contagens" });
    }
  }

  // POST /api/contagens
  if (req.method === 'POST') {
    try {
      console.log('Dados recebidos:', req.body);
      const data = insertContagemSchema.parse(req.body);
      console.log('Dados após parse:', data);
      const contagem = await storage.createContagem(data);
      console.log('Contagem criada:', contagem);
      return res.json(contagem);
    } catch (error) {
      console.error("Error creating contagem:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      }
      return res.status(500).json({ message: "Erro ao criar contagem" });
    }
  }

  // Método não permitido
  return res.status(405).json({ message: "Method not allowed" });
} 