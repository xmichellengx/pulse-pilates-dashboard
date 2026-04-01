export const dynamic = "force-dynamic"

interface ChatdaddyChat {
  id: string
  unread?: number
  lastMessage?: {
    timestamp?: number
  }
}

interface ChatdaddyChatsResponse {
  chats?: ChatdaddyChat[]
  cursor?: string
}

function getTodayMalaysia(): string {
  // UTC+8 offset
  const now = new Date()
  const myt = new Date(now.getTime() + 8 * 60 * 60 * 1000)
  return myt.toISOString().slice(0, 10) // "YYYY-MM-DD"
}

async function fetchAllChats(accountId: string, apiKey: string): Promise<ChatdaddyChat[]> {
  const baseUrl = process.env.CHATDADDY_BASE_URL ?? "https://api.chatdaddy.tech/im"
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  }

  const allChats: ChatdaddyChat[] = []
  let cursor: string | undefined = undefined
  let page = 0
  const maxPages = 10 // safety limit

  do {
    const url = new URL(`${baseUrl}/chats`)
    url.searchParams.set("accountId", accountId)
    url.searchParams.set("count", "200")
    url.searchParams.set("type", "individual")
    if (cursor) {
      url.searchParams.set("cursor", cursor)
    }

    const res = await fetch(url.toString(), {
      headers,
      cache: "no-store",
    })

    if (!res.ok) {
      console.error(`Chatdaddy /chats error: ${res.status} ${res.statusText}`)
      break
    }

    const data: ChatdaddyChatsResponse = await res.json()
    const chats = data.chats ?? []
    allChats.push(...chats)

    cursor = data.cursor
    page++
  } while (cursor && page < maxPages)

  return allChats
}

export async function GET() {
  try {
    const apiKey = process.env.CHATDADDY_API_KEY
    const accountId = process.env.CHATDADDY_ACCOUNT_ID

    if (!apiKey || !accountId) {
      return Response.json(
        { error: "Missing CHATDADDY_API_KEY or CHATDADDY_ACCOUNT_ID" },
        { status: 500 }
      )
    }

    const chats = await fetchAllChats(accountId, apiKey)
    const todayMYT = getTodayMalaysia()

    let incomingToday = 0
    let unreadTotal = 0

    for (const chat of chats) {
      const unread = chat.unread ?? 0
      unreadTotal += unread

      const ts = chat.lastMessage?.timestamp
      if (ts) {
        // timestamp is in seconds (Unix epoch)
        const msgDate = new Date((ts > 1e12 ? ts : ts * 1000) + 8 * 60 * 60 * 1000)
        const msgDay = msgDate.toISOString().slice(0, 10)
        if (msgDay === todayMYT) {
          incomingToday++
        }
      }
    }

    // Build lastUpdated in MYT (UTC+8)
    const now = new Date()
    const mytOffset = 8 * 60 * 60 * 1000
    const mytNow = new Date(now.getTime() + mytOffset)
    const lastUpdated = mytNow.toISOString().replace("Z", "+08:00")

    return Response.json({
      incomingToday,
      unreadTotal,
      activeChatsToday: incomingToday,
      lastUpdated,
    })
  } catch (err) {
    console.error("Chatdaddy stats error:", err)
    return Response.json({ error: "Failed to fetch Chatdaddy stats" }, { status: 500 })
  }
}
