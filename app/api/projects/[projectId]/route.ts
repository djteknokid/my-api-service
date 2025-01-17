import { MongoClient, ServerApiVersion } from 'mongodb';
import { NextRequest, NextResponse } from 'next/server';

const uri = process.env.MONGODB_URI!;

// CORS utility
function setCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Preflight CORS handler
export async function OPTIONS() {
  return NextResponse.json({}, { headers: setCorsHeaders() });
}

// GET: Fetch project by projectId
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    const { projectId } = await params; // Await the resolution of the params Promise
    console.log('GET endpoint hit for projectId:', projectId);

    await client.connect();
    const db = client.db('test');
    const projects = db.collection('projects');

    // Fetch the project with the provided projectId
    const project = await projects.findOne({ projectId });

    if (!project) {
      console.error(`Project with ID ${projectId} not found`);
      return NextResponse.json(
        { message: `Project ${projectId} not found` },
        { status: 404, headers: setCorsHeaders() }
      );
    }

    return NextResponse.json(project, { headers: setCorsHeaders() });
  } catch (err) {
    console.error('Error fetching project:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error occurred' },
      { status: 500, headers: setCorsHeaders() }
    );
  } finally {
    await client.close();
  }
}
