from PIL import Image
import os

def process_image(input_path, output_path):
    print(f"Processing {input_path} -> {output_path}")
    img = Image.open(input_path)
    img = img.convert("RGBA")
    
    data = img.getdata()
    
    new_data = []
    for item in data:
        # Aggressive threshold for "white"
        # If all components are above 200, assume it's background
        r, g, b, a = item
        if r > 200 and g > 200 and b > 200:
            # Check for "whiteness" - low variance between channels
            avg = (r + g + b) / 3
            if abs(r - avg) < 20 and abs(g - avg) < 20 and abs(b - avg) < 20:
                new_data.append((255, 255, 255, 0))
            else:
                new_data.append(item)
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    public_dir = r"c:\Users\USER\Desktop\Githubproject\fillgamedart\public"
    process_image(os.path.join(public_dir, "red_dart.jpg"), os.path.join(public_dir, "red_dart.png"))
    process_image(os.path.join(public_dir, "green_dart.jpg"), os.path.join(public_dir, "green_dart.png"))
