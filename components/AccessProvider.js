"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

const AccessContext = createContext({
  loading: true, user: null, tier: "free", isAdvanced: false,
})

export function AccessProvider({ children }) {
  const [state, setState] = useState({
    loading: true, user: null, tier: "free", isAdvanced: false,
  })

  useEffect(() => {
    let active = true

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        if (active) setState({ loading: false, user: null, tier: "free", isAdvanced: false })
        return
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("tier")
        .eq("id", user.id)
        .single()
      const tier = profile?.tier ?? "free"
      if (active) setState({ loading: false, user, tier, isAdvanced: tier === "advanced" })
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "SIGNED_OUT") {
        load()
      }
    })
    return () => { active = false; sub.subscription.unsubscribe() }
  }, [])

  return <AccessContext.Provider value={state}>{children}</AccessContext.Provider>
}

export function useAccess() {
  return useContext(AccessContext)
}
