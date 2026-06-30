import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { isAiServicesOwner } from "@/lib/api/admin"
import { AiServicesClient, type Engagement, type Invoice } from "@/components/ai-services/ai-services-client"

export default async function AiServicesPage() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const email = userData?.user?.email ?? null

  if (!isAiServicesOwner(email)) {
    redirect("/")
  }

  // RLS will already restrict to Michelle, but the anon-key client respects RLS
  // (and the page already redirected anyone else above).
  const [engRes, invRes] = await Promise.all([
    supabase.from("ai_engagements").select("*").order("created_at", { ascending: false }),
    supabase.from("ai_invoices").select("*").order("invoice_date", { ascending: false }),
  ])

  const engagements: Engagement[] = (engRes.data ?? []) as Engagement[]
  const invoices: Invoice[] = (invRes.data ?? []) as Invoice[]

  return (
    <div className="flex flex-col max-w-[1400px] mx-auto">
      <AiServicesClient engagements={engagements} invoices={invoices} />
    </div>
  )
}
