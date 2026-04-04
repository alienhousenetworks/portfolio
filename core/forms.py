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

# from .models import TrainingEnrollment, ReferralCode

# class TrainingEnrollmentForm(forms.ModelForm):
#     referral_code_text = forms.CharField(
#         max_length=50, 
#         required=True, 
#         label="Referral Code",
#         widget=forms.TextInput(attrs={
#             'class': 'w-full bg-black/50 border border-alien/20 rounded-none px-4 py-3 text-white placeholder-gray-600 focus:outline-none border-alien transition-all font-mono text-sm mb-4',
#             'placeholder': 'ENTER REFERRAL CODE (MANDATORY)'
#         }),
#         help_text="A valid referral code is required for enrollment."
#     )

#     class Meta:
#         model = TrainingEnrollment
#         fields = [
#             'full_name', 'email', 'phone', 'date_of_birth',
#             'college_name', 'degree', 'branch', 'year_of_study',
#             'skills', 'linkedin_url', 'github_url',
#             'field', 'sub_field', 'package'
#         ]
#         widgets = {
#             'date_of_birth': forms.DateInput(attrs={'type': 'date'}),
#             'field': forms.HiddenInput(),
#             'sub_field': forms.HiddenInput(),
#             'package': forms.HiddenInput(),
#         }

#     def __init__(self, *args, **kwargs):
#         super().__init__(*args, **kwargs)
#         # Apply standard alien class to all visible fields
#         alien_class = 'w-full bg-black/50 border border-alien/20 rounded-none px-4 py-3 text-white placeholder-gray-600 focus:outline-none border-alien transition-all font-mono text-sm mb-4'
#         for field_name, field in self.fields.items():
#             if not isinstance(field.widget, forms.HiddenInput):
#                 field.widget.attrs.update({'class': alien_class})
#                 if 'placeholder' not in field.widget.attrs:
#                     field.widget.attrs['placeholder'] = field.label.upper()

#     def clean_referral_code_text(self):
#         code_text = self.cleaned_data.get('referral_code_text')
#         try:
#             code_obj = ReferralCode.objects.get(code=code_text, is_active=True)
#             return code_obj
#         except ReferralCode.DoesNotExist:
#             raise forms.ValidationError("Invalid or inactive referral code.")
