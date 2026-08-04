import { useEffect } from 'react'
import { FieldErrors } from 'react-hook-form'

export function scrollToFirstError(errors: FieldErrors) {
  const errorKeys = Object.keys(errors)
  if (errorKeys.length === 0) return

  const firstErrorKey = errorKeys[0]

  // Find target DOM element by name, id, or data-field attribute
  const element =
    document.querySelector(`[name="${firstErrorKey}"]`) ||
    document.getElementById(firstErrorKey) ||
    document.querySelector(`[data-field="${firstErrorKey}"]`)

  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    if ('focus' in element && typeof (element as HTMLElement).focus === 'function') {
      ;(element as HTMLElement).focus({ preventScroll: true })
    }
  }
}

export function useFormAutoScroll(errors: FieldErrors) {
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      scrollToFirstError(errors)
    }
  }, [errors])
}
