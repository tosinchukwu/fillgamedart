from PIL import Image
import os

def process_image(input_path, output_path):
    print(f"Processing {input_path} -> {output_path}")
    img = Image.open(input_path)
    img = img.convert("RGBA")
    
    data = img.getdata()
    
    new_data = []
    for item in data:
        # Change all pixels that are white (or close to white) to transparent
        # Threshold: 240, 240, 240
        if item[0] > 240 and item[1] > 240 and item[2] > 240:
            new_data.append((255, 255, 255, 0))
        else:
            new_data.append(item)
            
    img.putdata(new_data)
    img.save(output_path, "PNG")

if __name__ == "__main__":
    public_dir = r"c:\Users\USER\Desktop\Githubproject\fillgamedart\public"
    process_image(os.path.join(public_dir, "red_dart.jpg"), os.path.join(public_dir, "red_dart.png"))
    process_image(os.path.join(public_dir, "green_dart.jpg"), os.path.join(public_dir, "green_dart.png"))
