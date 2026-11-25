export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    ok: true,
    service: "ilmai-pay",
    timestamp: new Date().toISOString(),
  });
}
