from django.core.management.base import BaseCommand
from django.conf import settings
import os
from PIL import Image

class Command(BaseCommand):
    help = 'Converts all images in the static textures directory to WebP format'

    def handle(self, *args, **kwargs):
        textures_dir = os.path.join(settings.BASE_DIR, 'core', 'static', 'core', 'textures')
        
        if not os.path.exists(textures_dir):
            self.stdout.write(self.style.ERROR(f"Directory not found: {textures_dir}"))
            return

        for filename in os.listdir(textures_dir):
            if filename.lower().endswith(('.png', '.jpg', '.jpeg')) and not filename.lower().endswith('.webp'):
                file_path = os.path.join(textures_dir, filename)
                try:
                    img = Image.open(file_path)
                    
                    # Convert to RGB if necessary, keeping transparency for PNGs
                    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
                        pass 
                    else:
                        img = img.convert('RGB')
                        
                    webp_filename = os.path.splitext(filename)[0] + '.webp'
                    webp_path = os.path.join(textures_dir, webp_filename)
                    
                    img.save(webp_path, 'WEBP', quality=80)
                    self.stdout.write(self.style.SUCCESS(f"Converted {filename} to {webp_filename}"))
                    
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Failed to convert {filename}: {str(e)}"))
