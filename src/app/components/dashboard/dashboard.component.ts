import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileParserService } from '../../services/file-parser.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent {
  fileName: string = '';
  fileContent: string = '';

  constructor(private fileService: FileParserService) {}

  onFileSelected(event: any) {
    const file: File = event.target.files[0];

    if (file) {
      this.fileName = file.name;

      // Use our service to read the file
      this.fileService.parseFile(file).then((text) => {
        this.fileContent = text;
      });
    }
  }
}
