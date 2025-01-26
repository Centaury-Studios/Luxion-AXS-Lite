'use client'

import { signIn, signOut, useSession } from 'next-auth/react'
import Image from 'next/image'

interface SignInButtonProps {
  className?: string
} 

export function SignInButton({ className = '' }: SignInButtonProps) {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  if (status === 'authenticated') {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          {session.user?.image && (
            <Image
              src={session.user.image}
              alt="User avatar"
              width={32}
              height={32}
              className="rounded-full"
            />
          )}
          <span className="text-sm">{session.user?.name}</span>
        </div>
        <button
          onClick={() => signOut()}
          className="px-4 py-2 text-sm text-white bg-red-600 rounded-md hover:bg-red-700"
        >
          Sign Out
        </button>
      </div>
    )
  }

  return (
    
    <button
    onClick={() => signIn('google')}
    className="relative overflow-hidden px-5 py-2 bg-[#99aebb] rounded-full flex items-center justify-center gap-2.5 text-white font-bold text-sm border-[3px] border-white/30 transition-all duration-300 ease-in-out hover:scale-105 hover:border-white/60 shadow-lg shadow-black/20 group">
      Sign In
      <div className="absolute -left-[100px] top-0 h-full w-[100px] opacity-60 group-hover:animate-shine bg-gradient-to-r from-transparent via-white/80 to-transparent [background-position:120deg]" />
    </button>

  )
}
