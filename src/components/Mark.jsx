// Marca do Mundu TV: um globo simples desenhado à mão
export default function Mark({ size = 24 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
      className="mark"
    >
      <circle cx="12" cy="12" r="9.25" />
      <ellipse cx="12" cy="12" rx="4" ry="9.25" />
      <path d="M3.5 9h17M3.5 15h17" />
    </svg>
  )
}
