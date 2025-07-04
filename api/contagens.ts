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

  try {
    // GET /api/contagens
    if (req.method === 'GET') {
      const contagens = await storage.getContagens();
      return res.json(contagens);
    }

    // POST /api/contagens
    if (req.method === 'POST') {
      console.log('Dados recebidos:', req.body);
      
      // Validar dados
      const validationResult = insertContagemSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.error('Erro de validação:', validationResult.error);
        return res.status(400).json({
          message: "Dados inválidos",
          errors: validationResult.error.errors
        });
      }

      // Validar data
      try {
        const date = new Date(validationResult.data.data);
        if (isNaN(date.getTime())) {
          return res.status(400).json({
            message: "Data inválida",
            errors: [{ path: ["data"], message: "Data inválida" }]
          });
        }
      } catch (error) {
        console.error('Erro ao validar data:', error);
        return res.status(400).json({
          message: "Data inválida",
          errors: [{ path: ["data"], message: "Data inválida" }]
        });
      }

      // Criar contagem
      try {
        const contagem = await storage.createContagem(validationResult.data);
        console.log('Contagem criada:', contagem);
        return res.json(contagem);
      } catch (error) {
        console.error('Erro ao criar contagem:', error);
        
        // Se for um erro do Supabase
        if (error && typeof error === 'object' && 'code' in error) {
          const supabaseError = error as { code: string; message: string };
          console.error('Erro do Supabase:', supabaseError);
          
          if (supabaseError.code === '23505') { // Unique violation
            return res.status(409).json({
              message: "Já existe uma contagem para esta data"
            });
          }
        }

        throw error; // Re-throw para ser pego pelo catch global
      }
    }

    // Método não permitido
    return res.status(405).json({ message: "Method not allowed" });
  } catch (error) {
    console.error("Erro na API:", error);
    
    // Se for um erro do Zod
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Dados inválidos",
        errors: error.errors
      });
    }

    // Erro genérico
    return res.status(500).json({
      message: "Erro interno do servidor",
      error: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
} 