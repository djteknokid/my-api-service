import { MongoClient, ServerApiVersion } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

console.log('HIT THE MAIN PROJECTS ROUTE');
console.log('MongoDB URI:', process.env.MONGODB_URI);

const uri = process.env.MONGODB_URI!;

const allowedOrigins = [
  'http://localhost:3001',
  'https://serve-dot-zipline.appspot.com/asset/a1c55a9d-1d13-5528-a560-23f2112a947c/zpc/htvt5n7qh96'
];

// Utility to set CORS headers
function setCorsHeaders(origin: string | null) {
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Preflight (OPTIONS) handler
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  return NextResponse.json({}, { headers: setCorsHeaders(origin) });
}

// Interfaces
interface ChatHistory {
  messages: ChatMessage[];
  metadata?: {
    lastMessageId: string;
    participantCount: number;
  };
}

interface ChatMessage {
  id: string;
  message: string;
  timestamp: Date;
  sender: string;
}

interface Artboard {
  id: string;
  name: string;
  elements: Array<{
    id: string;
    type: string;
    properties: Record<string, unknown>;
  }>;
  lastModified: Date;
}

interface Project {
  projectId: string;
  lastUpdated: Date;
  chatHistory?: ChatHistory;
  artboards?: Artboard[];
  publicHtml?: string;
  isPublished?: boolean;
}

// GET: Fetch all projects
export async function GET(request: NextRequest) {
  const origin = request.headers.get('origin');
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    console.log('Fetching all projects');
    await client.connect();
    const db = client.db("test");
    const projects = db.collection<Project>("projects");

    const allProjects = await projects.find({}).toArray();

    return NextResponse.json(
      { projects: allProjects },
      { headers: setCorsHeaders(origin) }
    );
  } catch (error: unknown) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        projects: [],
      },
      { status: 500, headers: setCorsHeaders(origin) }
    );
  } finally {
    try {
      await client.close();
    } catch (closeError) {
      console.error('Error closing MongoDB client:', closeError);
    }
  }
}

// POST: Create or update a project
export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    const payload = await request.json();
    const { projectId, chatHistory, artboards, publicHtml, isPublished } = payload as {
      projectId: string;
      chatHistory?: ChatHistory;
      artboards?: Artboard[];
      publicHtml?: string;
      isPublished?: boolean;
    };

    if (!projectId) {
      console.error('Missing projectId in request');
      return NextResponse.json(
        { message: 'Missing projectId' },
        { status: 400, headers: setCorsHeaders(origin) }
      );
    }

    console.log('Saving project:', {
      projectId,
      artboardCount: artboards?.length,
      hasHtml: !!publicHtml,
    });

    await client.connect();
    const db = client.db("test");
    const projects = db.collection<Project>("projects");

    const update = {
      $set: {
        projectId,
        lastUpdated: new Date(),
        ...(chatHistory && { chatHistory }),
        ...(artboards && { artboards }),
        ...(publicHtml && { publicHtml }),
        ...(isPublished && { isPublished }),
      },
    };

    const result = await projects.updateOne({ projectId }, update, { upsert: true });

    return NextResponse.json(
      { message: "Project updated successfully", result },
      { headers: setCorsHeaders(origin) }
    );
  } catch (error: unknown) {
    console.error('Error saving project:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500, headers: setCorsHeaders(origin) }
    );
  } finally {
    try {
      await client.close();
    } catch (closeError) {
      console.error('Error closing MongoDB client:', closeError);
    }
  }
}
