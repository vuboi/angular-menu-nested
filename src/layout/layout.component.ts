import { Component } from "@angular/core";
import { RouterModule } from "@angular/router";
import { HeaderComponent } from "./header/header.component";
import { SidebarComponent } from "./sidebar/sidebar.component";

@Component({
  selector: "app-layout",
  templateUrl: "./layout.component.html",
  styleUrl: "./layout.component.scss",
  standalone: true,
  imports: [
    RouterModule,
    HeaderComponent,
    SidebarComponent
  ],
})

export class LayoutComponent {
  constructor() { }
}
