import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenTool, Scroll } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { travelPlanService } from '../services/travelPlanService'; 

export const CreateTravelPlan = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    budget: 0,
    notes: ''
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'budget' ? Number(value) : value
    }));
  };

  const validateForm = () => {
    if (!formData.name || !formData.startDate || !formData.endDate) {
      return "Please fill in all required fields (Name, Start Date, End Date).";
    }
    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      return "The end date cannot precede the start date.";
    }
    if (formData.budget < 0) {
      return "The expedition budget cannot be negative.";
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    try {
      const newPlan = await travelPlanService.create(formData);
      
      navigate(`/travel-plans/${newPlan.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to chart the expedition in the archives.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8">
      <div className="flex items-center gap-3 mb-6">
        <Scroll className="w-8 h-8 text-rust" />
        <div>
          <h1 className="text-3xl font-display text-ink border-b border-sepia/30 pb-2">Chart a New Journey</h1>
          <p className="font-functional text-sm text-ink-light mt-1">Inscribe the parameters of your upcoming expedition.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-parchment-dark p-6 sm:p-8 rounded-sm shadow-md border border-sepia/30 relative">
        {/* Decorative Corner Ornaments */}
        <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2 border-sepia/40"></div>
        <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2 border-sepia/40"></div>
        <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2 border-sepia/40"></div>
        <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2 border-sepia/40"></div>

        {error && (
          <div className="mb-6 p-3 bg-red-900/10 border border-rust text-rust text-sm font-functional text-center rounded-sm">
            {error}
          </div>
        )}

        <div className="space-y-5">
          <Input 
            label="Expedition Name *" 
            name="name" 
            value={formData.name} 
            onChange={handleChange} 
            placeholder="e.g., The Grand Alpine Crossing"
            required 
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <Input 
              label="Date of Departure *" 
              name="startDate" 
              type="date" 
              value={formData.startDate} 
              onChange={handleChange} 
              required 
            />
            <Input 
              label="Date of Return *" 
              name="endDate" 
              type="date" 
              value={formData.endDate} 
              onChange={handleChange} 
              required 
            />
          </div>

          <Input 
            label="Treasury Budget (Gold/Coins)" 
            name="budget" 
            type="number" 
            min="0"
            step="0.01"
            value={formData.budget} 
            onChange={handleChange} 
          />

          <Input 
            label="Brief Synopsis" 
            name="description" 
            isTextArea 
            value={formData.description} 
            onChange={handleChange} 
            placeholder="Describe the purpose and hopes of this journey..."
          />

          <Input 
            label="Archivist Notes (Private)" 
            name="notes" 
            isTextArea 
            value={formData.notes} 
            onChange={handleChange} 
            placeholder="Any specific reminders, warnings, or marginalia..."
          />
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-sepia/20">
          <Button type="button" variant="secondary" onClick={() => navigate('/dashboard')}>
            Abandon Draft
          </Button>
          <Button type="submit" isLoading={loading}>
            <PenTool className="w-4 h-4" />
            Seal Ledger Entry
          </Button>
        </div>
      </form>
    </div>
  );
};