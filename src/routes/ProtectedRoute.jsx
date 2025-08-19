import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
export default function ProtectedRoute({children}){
  const { loading, session } = useAuth()
  if(loading) return <div className="p-6">Carregando...</div>
  if(!session) return <Navigate to="/login" replace />
  return children
}
