'use client'

import { useState } from 'react'

export default function CommentForm({ postId }: { postId: number }) {
  const [authorName, setAuthorName] = useState('')
  const [content, setContent] = useState('')
  const [msg, setMsg] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ post: postId, authorName, content }),
      })
      if (res.ok) {
        setMsg('Comentário enviado! Ele aparece após ser aprovado. 💛')
        setAuthorName('')
        setContent('')
      } else {
        setMsg('Não foi possível enviar agora. Tente novamente.')
      }
    } catch {
      setMsg('Erro de conexão. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="comment-form" onSubmit={handleSubmit}>
      <label htmlFor="c-name">Seu nome</label>
      <input
        id="c-name"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        required
        maxLength={80}
      />
      <label htmlFor="c-content">Comentário</label>
      <textarea
        id="c-content"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        required
        rows={4}
      />
      <button type="submit" className="btn" disabled={loading}>
        {loading ? 'Enviando...' : 'Comentar'}
      </button>
      {msg && <p className="comment-form__msg">{msg}</p>}
    </form>
  )
}
