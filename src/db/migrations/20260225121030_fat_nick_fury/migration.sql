CREATE TABLE "cloud"."industries" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL,
	"slug" varchar(100) NOT NULL UNIQUE
);
