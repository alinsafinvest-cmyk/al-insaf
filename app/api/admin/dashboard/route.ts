// বাংলা: এই API route-এ admin → dashboard সংক্রান্ত request যাচাই, data access এবং JSON response পরিচালিত হয়।
import { GET as getDashboard } from "@/app/api/dashboard/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// বাংলা: GET অনুরোধে প্রয়োজনীয় তথ্য পড়ে অনুমোদিত ফলাফল ফেরত দেয়।
export async function GET(request: Request) {
    return getDashboard();
}
