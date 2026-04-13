"use client"

import { useEffect, useState } from "react"

function getGreeting(hour: number) {
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export function Greeting({ name }: { name: string }) {
  const [greeting, setGreeting] = useState("")
  const [today, setToday] = useState("")

  useEffect(() => {
    const now = new Date()
    setGreeting(getGreeting(now.getHours()))
    setToday(formatDate(now))
  }, [])

  return (
    <div>
      <p className="text-xs font-medium text-slate-400 mb-0.5">{today}</p>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        {greeting}, {name}
      </h1>
      <p className="text-sm text-slate-500 mt-0.5">
        Here&apos;s what&apos;s happening with Pulse Pilates today.
      </p>
    </div>
  )
}
