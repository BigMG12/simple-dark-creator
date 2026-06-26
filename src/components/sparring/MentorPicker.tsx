import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { FALLBACK_MENTORS } from '@/data/sparring/mentors';

interface MentorPickerProps {
  value: string;
  onChange: (mentorId: string, mentorName: string) => void;
}

interface Mentor {
  id: string;
  name: string;
  description?: string;
}

export function MentorPicker({ value, onChange }: MentorPickerProps) {
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMentors() {
      try {
        const { data, error } = await supabase
          .from('speakers')
          .select('id, name, description')
          .limit(10);

        if (error || !data || data.length === 0) {
          // Fallback do hardcoded mentorów
          setMentors(FALLBACK_MENTORS.map(m => ({ id: m.id, name: m.name, description: m.short_description })));
        } else {
          setMentors(data);
        }
      } catch {
        setMentors(FALLBACK_MENTORS.map(m => ({ id: m.id, name: m.name, description: m.short_description })));
      } finally {
        setLoading(false);
      }
    }

    fetchMentors();
  }, []);

  const selectedMentor = mentors.find(m => m.id === value) || FALLBACK_MENTORS.find(m => m.id === value);

  return (
    <div className="space-y-2">
      <Select
        value={value}
        onValueChange={(id) => {
          const mentor = mentors.find(m => m.id === id);
          if (mentor) {
            onChange(id, mentor.name);
          }
        }}
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? 'Ładowanie...' : 'Wybierz mentora'} />
        </SelectTrigger>
        <SelectContent>
          {mentors.map((mentor) => (
            <SelectItem key={mentor.id} value={mentor.id}>
              {mentor.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {selectedMentor && (
        <p className="text-xs text-muted-foreground italic">
          {("description" in selectedMentor ? selectedMentor.description : undefined) ||
            FALLBACK_MENTORS.find(m => m.id === value)?.short_description}
        </p>
      )}
    </div>
  );
}
