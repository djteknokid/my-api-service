import { MongoClient, ServerApiVersion } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

console.log('HIT THE MAIN PROJECTS ROUTE');
console.log('MongoDB URI:', process.env.MONGODB_URI); 

const uri = process.env.MONGODB_URI!;

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

// Utility to set CORS headers
function setCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',  // Adjust in production for security
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: setCorsHeaders() });
}

// GET: Fetch all projects
export async function GET() {
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

    return NextResponse.json({ projects: allProjects }, { headers: setCorsHeaders() });
  } catch (error: unknown) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred', projects: [] },
      { status: 500, headers: setCorsHeaders() }
    );
  } finally {
    await client.close();
  }
}

// POST: Create or update a project
export async function POST(request: NextRequest) {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    const { projectId, chatHistory, artboards, publicHtml, isPublished } = await request.json() as {
      projectId: string;
      chatHistory?: ChatHistory;
      artboards?: Artboard[];
      publicHtml?: string;
      isPublished?: boolean;
    };

    if (!projectId) {
      return NextResponse.json(
        { message: 'Missing projectId' },
        { status: 400, headers: setCorsHeaders() }
      );
    }

    console.log('Saving project:', { 
      projectId, 
      artboardCount: artboards?.length,
      hasHtml: !!publicHtml 
    });

    await client.connect();
    const db = client.db("test");
    const projects = db.collection<Project>("projects");

    const update: { $set: Partial<Project> } = {
      $set: {
        projectId,
        lastUpdated: new Date(),
        ...(chatHistory && { chatHistory }),
        ...(artboards && { artboards }),
        ...(publicHtml && { publicHtml }),
        ...(isPublished && { isPublished })
      },
    };

    const result = await projects.updateOne({ projectId }, update, { upsert: true });

    return NextResponse.json(
      { message: "Project updated successfully", result },
      { headers: setCorsHeaders() }
    );
  } catch (error: unknown) {
    console.error('Error saving project:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500, headers: setCorsHeaders() }
    );
  } finally {
    await client.close();
  }
}