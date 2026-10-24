CREATE TABLE `properties` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `slug` text NOT NULL UNIQUE,
  `title` text NOT NULL,
  `locality` text NOT NULL,
  `city` text NOT NULL,
  `state` text NOT NULL,
  `price` integer NOT NULL,
  `bhk` integer NOT NULL,
  `property_type` text NOT NULL,
  `furnished` integer DEFAULT false NOT NULL,
  `area_sqft` integer NOT NULL,
  `floor` integer NOT NULL,
  `total_floors` integer NOT NULL,
  `parking` integer DEFAULT 1 NOT NULL,
  `description` text NOT NULL,
  `amenities` text NOT NULL,
  `images` text NOT NULL,
  `featured` integer DEFAULT false NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `enquiries` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `property_id` integer NOT NULL REFERENCES `properties`(`id`) ON DELETE CASCADE,
  `name` text NOT NULL,
  `phone` text NOT NULL,
  `email` text,
  `message` text NOT NULL,
  `preferred_visit_date` text NOT NULL,
  `ip_hash` text NOT NULL,
  `status` text DEFAULT 'new' NOT NULL,
  `created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rate_limits` (
  `key` text PRIMARY KEY NOT NULL,
  `window_started_at` integer NOT NULL,
  `request_count` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `properties_city_idx` ON `properties` (`city`);
--> statement-breakpoint
CREATE INDEX `properties_locality_idx` ON `properties` (`locality`);
--> statement-breakpoint
CREATE INDEX `properties_price_idx` ON `properties` (`price`);
--> statement-breakpoint
CREATE INDEX `properties_bhk_idx` ON `properties` (`bhk`);
--> statement-breakpoint
CREATE INDEX `properties_type_idx` ON `properties` (`property_type`);
--> statement-breakpoint
CREATE INDEX `properties_furnished_idx` ON `properties` (`furnished`);
--> statement-breakpoint
CREATE INDEX `properties_created_at_idx` ON `properties` (`created_at`);
--> statement-breakpoint
CREATE INDEX `properties_featured_idx` ON `properties` (`featured`);
--> statement-breakpoint
CREATE INDEX `enquiries_property_id_idx` ON `enquiries` (`property_id`);
--> statement-breakpoint
CREATE INDEX `enquiries_created_at_idx` ON `enquiries` (`created_at`);
