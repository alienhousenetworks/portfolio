from PIL import Image
from io import BytesIO
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import UploadedFile
import os
import logging

logger = logging.getLogger(__name__)

def compress_image_to_webp(image_field, quality=80):
    """
    Compresses a Django ImageField to WebP format.
    Checks if the file is a newly uploaded file before processing to avoid re-compression loops.
    """
    if not image_field:
        return

    # Check if the file is an uploaded file (InMemoryUploadedFile or TemporaryUploadedFile)
    # If it's a FieldFile (already saved to storage), we skip.
    try:
        if not hasattr(image_field, 'file') or not isinstance(image_field.file, UploadedFile):
            return
    except Exception:
        # If accessing file fails for some reason (e.g. missing file), just return
        return

    try:
        # Open the image using Pillow
        img = Image.open(image_field)
        
        # Convert to RGB if necessary (keeping transparency if possible)
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
        
    except Exception as e:
        logger.error(f"Error compressing image {image_field}: {e}")
        # Proceed without compression if error occurs
        pass
