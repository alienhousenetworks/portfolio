from django import forms
from .models import JobApplication, ContactMessage

class JobApplicationForm(forms.ModelForm):
    class Meta:
        model = JobApplication
        fields = ['full_name', 'email', 'phone', 'resume', 'cover_letter']
        widgets = {
            'full_name': forms.TextInput(attrs={
                'class': 'w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors',
                'placeholder': 'Your Full Name'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors',
                'placeholder': 'email@example.com'
            }),
            'phone': forms.TextInput(attrs={
                'class': 'w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors',
                'placeholder': '+1 (555) 000-0000'
            }),
            'resume': forms.FileInput(attrs={
                'class': 'w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 transition-colors cursor-pointer'
            }),
            'cover_letter': forms.Textarea(attrs={
                'class': 'w-full bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 transition-colors h-32',
                'placeholder': 'Tell us why you are a great fit...'
            }),
        }

class ContactForm(forms.ModelForm):
    class Meta:
        model = ContactMessage
        fields = ['name', 'phone', 'email', 'company', 'message']
        widgets = {
            'name': forms.TextInput(attrs={
                'class': 'w-full bg-black/50 border border-alien/20 rounded-none px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-alien focus:ring-1 focus:ring-alien transition-all font-mono text-sm',
                'placeholder': 'NAME'
            }),
            'phone': forms.TextInput(attrs={
                'class': 'w-full bg-black/50 border border-alien/20 rounded-none px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-alien focus:ring-1 focus:ring-alien transition-all font-mono text-sm',
                'placeholder': 'PHONE'
            }),
            'email': forms.EmailInput(attrs={
                'class': 'w-full bg-black/50 border border-alien/20 rounded-none px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-alien focus:ring-1 focus:ring-alien transition-all font-mono text-sm',
                'placeholder': 'EMAIL'
            }),
            'company': forms.TextInput(attrs={
                'class': 'w-full bg-black/50 border border-alien/20 rounded-none px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-alien focus:ring-1 focus:ring-alien transition-all font-mono text-sm',
                'placeholder': 'COMPANY (Optional)'
            }),
            'message': forms.Textarea(attrs={
                'class': 'w-full bg-black/50 border border-alien/20 rounded-none px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-alien focus:ring-1 focus:ring-alien transition-all font-mono text-sm h-32',
                'placeholder': 'MESSAGE...'
            }),
        }
