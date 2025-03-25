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
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
    'Access-Control-Max-Age': '86400',
  };
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: setCorsHeaders()
  });
}

// Configure body parser options
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb'
    }
  }
};

// GET: Fetch all projects
export async function GET(request: NextRequest) {
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
  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 204,
      headers: setCorsHeaders()
    });
  }

  const client = new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });

  try {
    const { projectId, chatHistory, artboards, publicHtml, isPublished, chunkIndex, totalChunks } = await request.json() as {
      projectId: string;
      chatHistory?: ChatHistory;
      artboards?: Artboard[];
      publicHtml?: string;
      isPublished?: boolean;
      chunkIndex?: number;
      totalChunks?: number;
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
      hasHtml: !!publicHtml,
      chunk: chunkIndex !== undefined ? `${chunkIndex + 1}/${totalChunks}` : 'full'
    });

    await client.connect();
    const db = client.db("test");
    const projects = db.collection<Project>("projects");

    // Handle chunked artboard updates
    if (chunkIndex !== undefined && totalChunks !== undefined) {
      // Store chunk in temporary collection
      const chunks = db.collection("temp_chunks");
      await chunks.updateOne(
        { projectId, chunkIndex },
        { $set: { artboards } },
        { upsert: true }
      );

      // If this is the last chunk, combine all chunks and update the project
      if (chunkIndex === totalChunks - 1) {
        const allChunks = await chunks.find({ projectId }).sort({ chunkIndex: 1 }).toArray();
        const combinedArtboards = allChunks.flatMap(chunk => chunk.artboards);

        // Update project with combined artboards
        await projects.updateOne(
          { projectId },
          {
            $set: {
              projectId,
              lastUpdated: new Date(),
              artboards: combinedArtboards
            }
          },
          { upsert: true }
        );

        // Clean up temporary chunks
        await chunks.deleteMany({ projectId });

        return NextResponse.json(
          { message: "Project updated successfully with all chunks" },
          { headers: setCorsHeaders() }
        );
      }

      return NextResponse.json(
        { message: `Chunk ${chunkIndex + 1}/${totalChunks} saved successfully` },
        { headers: setCorsHeaders() }
      );
    }

    // Handle non-chunked updates (chat history, HTML, etc.)
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
