import { MongoClient, ServerApiVersion } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

// Environment variable for MongoDB connection
const uri = process.env.MONGODB_URI!;

interface ChatHistory {
  id: string;
  timestamp: Date;
  content: string;
  sender: string;
}

interface Artboard {
  id: string;
  name: string;
  content: unknown;
  lastModified: Date;
}

interface Project {
  projectId: string;
  lastUpdated: Date;
  chatHistory?: ChatHistory[];
  artboards?: Artboard[];
}

// Utility to handle CORS
function setCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*', // Allow all origins for testing. Limit in production.
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Preflight CORS handler for OPTIONS
export async function OPTIONS() {
  return NextResponse.json({}, { headers: setCorsHeaders() });
}

// GET: Fetch project by projectId
export async function GET(
  _request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    const { projectId } = params;
    console.log('Fetching project:', projectId);

    await client.connect();
    const db = client.db("test");
    const projects = db.collection<Project>("projects");

    // Fetch the project with the provided projectId
    const project = await projects.findOne({ projectId });

    return NextResponse.json(project || {}, { headers: setCorsHeaders() });
  } catch (err) {
    console.error('DB Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error occurred' },
      { status: 500, headers: setCorsHeaders() }
    );
  } finally {
    await client.close();
  }
}

// POST: Update or create project by projectId
export async function POST(request: NextRequest) {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    const { projectId, chatHistory, artboards } = await request.json() as {
      projectId: string;
      chatHistory?: ChatHistory[];
      artboards?: Artboard[];
    };

    console.log('Saving project:', { projectId, artboardCount: artboards?.length });

    await client.connect();
    const db = client.db("test");
    const projects = db.collection<Project>("projects");

    // Update or insert the project
    const update = {
      $set: {
        projectId,
        lastUpdated: new Date(),
        ...(chatHistory && { chatHistory }),
        ...(artboards && { artboards }),
      },
    };

    const result = await projects.updateOne({ projectId }, update, { upsert: true });

    return NextResponse.json(
      { message: "Project updated successfully", result },
      { headers: setCorsHeaders() }
    );
  } catch (err) {
    console.error('MongoDB save error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error occurred' },
      { status: 500, headers: setCorsHeaders() }
    );
  } finally {
    await client.close();
  }
}
