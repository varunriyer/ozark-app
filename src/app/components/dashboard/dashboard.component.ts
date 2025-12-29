import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule for directives
import { FileParserService } from '../../services/file-parser.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule], // Add CommonModule here
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  constructor(private fileService: FileParserService) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      console.log('File selected:', file.name);
      // Pass the file to our service
      this.fileService.parseFile(file).then((content) => {
        console.log('File processing complete.');
      });
    }
  }
}
