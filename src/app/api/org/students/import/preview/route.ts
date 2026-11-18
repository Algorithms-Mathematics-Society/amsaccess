import { studentImportProxy } from "@/lib/server/studentImportProxy";
export async function POST(request: Request) {
  return studentImportProxy(request, "preview");
}
