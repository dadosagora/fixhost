import React,{createContext,useContext,useEffect,useState} from 'react'
import { supabase } from '../lib/supabase'
const AuthContext=createContext(null)
export function AuthProvider({children}){
  const [session,setSession]=useState(null)
  const [loading,setLoading]=useState(true)
  const [profile,setProfile]=useState(null)
  useEffect(()=>{
    let mounted=true
    async function init(){
      const { data:{ session } } = await supabase.auth.getSession()
      if(!mounted) return
      setSession(session); setLoading(false)
      if(session?.user) fetchProfile(session.user.id)
    }
    init()
    const { data:sub } = supabase.auth.onAuthStateChange((_e,s)=>{
      setSession(s); if(s?.user) fetchProfile(s.user.id); else setProfile(null)
    })
    return ()=>{ mounted=false; sub.subscription.unsubscribe() }
  },[])
  async function fetchProfile(uid){
    const { data } = await supabase.from('app_users').select('*').eq('id',uid).single()
    if(data) setProfile(data)
  }
  return <AuthContext.Provider value={{session,user:session?.user||null,profile,loading}}>{children}</AuthContext.Provider>
}
export function useAuth(){ return useContext(AuthContext) }
