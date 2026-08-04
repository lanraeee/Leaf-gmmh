'use client'

import { CameraCapture } from '@/components/media/CameraCapture'
import { Textarea } from '@/components/ui/textarea'

interface ClothingData {
  head: string
  upper: string
  lower: string
  footwear: string
  accessories: string
  notes: string
}

interface AppearanceStepProps {
  clothing: ClothingData
  onClothingChange: (field: keyof ClothingData, value: string) => void
  onPhotoCapture: (dataUrl: string, blob: Blob) => void
  onPhotoClear: () => void
  hasPhoto: boolean
}

const CLOTHING_FIELDS: { key: keyof ClothingData; label: string; placeholder: string }[] = [
  { key: 'head', label: 'Head / Hair', placeholder: 'e.g. short brown hair, blue baseball cap' },
  { key: 'upper', label: 'Upper body', placeholder: 'e.g. navy blue hoodie, white t-shirt underneath' },
  { key: 'lower', label: 'Lower body', placeholder: 'e.g. black jeans, grey joggers' },
  { key: 'footwear', label: 'Footwear', placeholder: 'e.g. white Nike trainers, black boots' },
  { key: 'accessories', label: 'Accessories', placeholder: 'e.g. brown leather bag, silver watch' },
]

export function AppearanceStep({ clothing, onClothingChange, onPhotoCapture, onPhotoClear, hasPhoto }: AppearanceStepProps) {
  return (
    <div className="space-y-6">
      {/* Photo */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-2">
          Patient photo <span className="text-gray-400 font-normal">(face will be auto-blurred)</span>
        </p>
        <CameraCapture
          onPhotoCapture={onPhotoCapture}
          onClear={onPhotoClear}
          className="mb-4"
        />
      </div>

      {/* Clothing fields */}
      <div>
        <p className="text-sm font-medium text-gray-700 mb-3">Clothing description</p>
        <div className="space-y-3">
          {CLOTHING_FIELDS.map(({ key, label, placeholder }) => (
            <div key={key} className="flex gap-3 items-start">
              <div className="w-24 text-xs font-semibold text-gray-500 pt-3 shrink-0">{label}</div>
              <Textarea
                value={clothing[key]}
                onChange={(e) => onClothingChange(key, e.target.value)}
                placeholder={placeholder}
                rows={1}
                className="flex-1 min-h-0 resize-none"
              />
            </div>
          ))}
          <div className="flex gap-3 items-start">
            <div className="w-24 text-xs font-semibold text-gray-500 pt-3 shrink-0">Notes</div>
            <Textarea
              value={clothing.notes}
              onChange={(e) => onClothingChange('notes', e.target.value)}
              placeholder="Any additional appearance notes..."
              rows={2}
              className="flex-1"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
