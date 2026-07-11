'use client'

import { useEffect, useState } from 'react'

// Botao de curtir: incrementa no servidor (POST /api/posts/:id/like) e guarda
// no navegador que este visitante ja curtiu (1 curtida por navegador).
export default function LikeButton({
  postId,
  initialLikes,
  apiBase = '',
}: {
  postId: number
  initialLikes: number
  apiBase?: string
}) {
  const [likes, setLikes] = useState(initialLikes)
  const [liked, setLiked] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setLiked(localStorage.getItem(`du-liked-${postId}`) === '1')
  }, [postId])

  async function like() {
    if (liked || busy) return
    setBusy(true)
    // otimista: atualiza na hora e desfaz se falhar
    setLikes((l) => l + 1)
    setLiked(true)
    try {
      const res = await fetch(`${apiBase}/api/posts/${postId}/like`, { method: 'POST' })
      if (res.ok) {
        const j = (await res.json()) as { likes: number }
        setLikes(j.likes)
        localStorage.setItem(`du-liked-${postId}`, '1')
      } else {
        setLikes((l) => l - 1)
        setLiked(false)
      }
    } catch {
      setLikes((l) => l - 1)
      setLiked(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      className={`like-btn ${liked ? 'like-btn--liked' : ''}`}
      onClick={like}
      aria-pressed={liked}
      title={liked ? 'Você já curtiu' : 'Curtir'}
    >
      {liked ? '❤️' : '🤍'} {likes} {likes === 1 ? 'curtida' : 'curtidas'}
    </button>
  )
}
