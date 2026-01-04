/**
 * StructuredNoteTags - Lightweight clinical context tags
 * Safe signals without diagnosis or treatment
 */

import { Tag, Check } from 'lucide-react';

// Pre-defined safe tags (no diagnosis, no treatment)
export const SAFE_NOTE_TAGS = [
    { id: 'asymptomatic', label: 'Patient asymptomatic', category: 'status' },
    { id: 'compliance_good', label: 'Good compliance', category: 'compliance' },
    { id: 'compliance_poor', label: 'Compliance poor', category: 'compliance' },
    { id: 'lifestyle_reinforced', label: 'Lifestyle advice reinforced', category: 'education' },
    { id: 'followup_advised', label: 'Follow-up advised', category: 'action' },
    { id: 'family_counseled', label: 'Family counseled', category: 'education' },
    { id: 'patient_stable', label: 'Patient stable', category: 'status' },
    { id: 'monitoring_ongoing', label: 'Monitoring ongoing', category: 'action' },
] as const;

export type NoteTagId = typeof SAFE_NOTE_TAGS[number]['id'];

interface StructuredNoteTagsProps {
    selectedTags: NoteTagId[];
    onChange: (tags: NoteTagId[]) => void;
    disabled?: boolean;
}

export function StructuredNoteTags({
    selectedTags,
    onChange,
    disabled = false,
}: StructuredNoteTagsProps) {
    const toggleTag = (tagId: NoteTagId) => {
        if (disabled) return;

        if (selectedTags.includes(tagId)) {
            onChange(selectedTags.filter(t => t !== tagId));
        } else {
            onChange([...selectedTags, tagId]);
        }
    };

    const groupedTags = SAFE_NOTE_TAGS.reduce((acc, tag) => {
        if (!acc[tag.category]) acc[tag.category] = [];
        acc[tag.category].push(tag);
        return acc;
    }, {} as Record<string, typeof SAFE_NOTE_TAGS[number][]>);

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
                <Tag className="h-4 w-4" />
                <span>Quick Tags</span>
                <span className="text-xs text-muted-foreground">(optional)</span>
            </div>

            {Object.entries(groupedTags).map(([category, tags]) => (
                <div key={category}>
                    <p className="text-xs text-muted-foreground capitalize mb-1.5">{category}</p>
                    <div className="flex flex-wrap gap-2">
                        {tags.map(tag => {
                            const isSelected = selectedTags.includes(tag.id);
                            return (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => toggleTag(tag.id)}
                                    disabled={disabled}
                                    className={`
                                        inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs
                                        transition-colors border
                                        ${isSelected
                                            ? 'bg-primary text-primary-foreground border-primary'
                                            : 'bg-muted/50 hover:bg-muted border-transparent'
                                        }
                                        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                    `}
                                >
                                    {isSelected && <Check className="h-3 w-3" />}
                                    {tag.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {selectedTags.length > 0 && (
                <p className="text-xs text-muted-foreground">
                    {selectedTags.length} tag{selectedTags.length > 1 ? 's' : ''} selected
                </p>
            )}
        </div>
    );
}

export default StructuredNoteTags;
