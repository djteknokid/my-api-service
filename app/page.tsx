
export default function Home() {
  return (
    <div style={{ padding: '2rem' }}>
      <h1>API Endpoints</h1>
      <ul>
        <li>
          <strong>GET /api/projects</strong>
          <p>Retrieves all projects</p>
        </li>
        <li>
          <strong>GET /api/projects/[projectId]</strong>
          <p>Retrieves a specific project</p>
        </li>
        <li>
          <strong>POST /api/projects</strong>
          <p>Creates or updates a project</p>
        </li>
      </ul>
    </div>
  );
}