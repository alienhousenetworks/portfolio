from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
import os

def compress_image_to_webp(image_field, quality=80):
    """
    Compresses a Django ImageField to WebP format.
    """
    if not image_field:
        return

    # Open the image using Pillow
    img = Image.open(image_field)
    
    # Convert to RGB if necessary (e.g. for PNGs with transparency, keeping transparency for WebP is possible but RGB is safer for JPEGs)
    # Actually, WebP supports transparency. Let's keep RGBA if it has it.
    if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
        pass # Keep transparency
    else:
        img = img.convert('RGB')

    # Save to BytesIO buffer
    buffer = BytesIO()
    img.save(buffer, format='WEBP', quality=quality)
    
    # Get the mapping of the new content
    new_content = ContentFile(buffer.getvalue())
    
    # Change the filename extension
    filename, ext = os.path.splitext(image_field.name)
    new_filename = f"{filename}.webp"
    
    # Save the new file to the field (this does not save the model, just updates the file field)
    image_field.save(new_filename, new_content, save=False)
