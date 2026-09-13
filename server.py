import os
import json
from http.server import SimpleHTTPRequestHandler, HTTPServer

class NotesHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/notes.json':
            notes_dir = 'notes'
            notes = []

            if os.path.exists(notes_dir):
                for filename in os.listdir(notes_dir):
                    if filename.endswith('.md'):
                        filepath = os.path.join(notes_dir, filename)
                        stat_info = os.stat(filepath)
                        with open(filepath, 'r', encoding='utf-8') as f:
                            content = f.read()

                        notes.append({
                            'id': filename[:-3],
                            'content': content,
                            'mtime': int(stat_info.st_mtime * 1000)
                        })

            response = json.dumps({'notes': notes})

            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Content-Length', str(len(response.encode('utf-8'))))
            self.end_headers()

            self.wfile.write(response.encode('utf-8'))
        else:
            super().do_GET()

if __name__ == '__main__':
    port = 8000
    server_address = ('', port)
    httpd = HTTPServer(server_address, NotesHandler)
    print(f"Starting server on port {port}...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    httpd.server_close()
