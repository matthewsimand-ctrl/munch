-- Generated from output/community-seed-master.cleaned.jsonl
-- Run this migration to load Munch-curated seed recipes into public.recipes.

begin;

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Classic Spaghetti Carbonara',
  'https://imagesvc.meredithcorp.io/v3/mm/image?url=https%3A%2F%2Fimages.media-allrecipes.com%2Fuserphotos%2F666937.jpg',
  '20 min',
  'Beginner',
  ARRAY['1 pound spaghetti', '4 slices bacon, chopped', '2 cloves garlic, minced', '2 large eggs', '1/2 cup grated Parmesan cheese', 'Salt and black pepper to taste', '2 tablespoons chopped fresh parsley']::text[],
  ARRAY['pasta', 'dinner', 'quick', 'italian', 'budget']::text[],
  ARRAY['Bring a large pot of lightly salted water to a boil. Cook spaghetti until al dente, about 8 to 10 minutes.', 'In a large skillet, cook bacon over medium heat until crisp. Add garlic and cook for 1 minute more.', 'In a small bowl, whisk eggs and Parmesan cheese together until well combined.', 'Drain pasta, reserving 1/2 cup of the cooking water. Add pasta to the skillet with the bacon and garlic.', 'Remove skillet from heat. Quickly pour the egg mixture over the pasta, tossing constantly to create a creamy sauce without scrambling the eggs. Add reserved water if needed.', 'Season with salt, black pepper, and parsley. Serve immediately.']::text[],
  'community-seed',
  'https://www.allrecipes.com/recipe/11973/spaghetti-carbonara-ii/',
  'Munch',
  'Italian',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.allrecipes.com/recipe/11973/spaghetti-carbonara-ii/","original_chef":"AllRecipes"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Classic Spaghetti Carbonara')
     or (
       'https://www.allrecipes.com/recipe/11973/spaghetti-carbonara-ii/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.allrecipes.com/recipe/11973/spaghetti-carbonara-ii/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Easy Chicken Stir-Fry',
  'https://www.delish.com/classic-chicken-stir-fry-horizontal.jpg',
  '25 min',
  'Beginner',
  ARRAY['1 lb chicken breast, cut into bite-sized pieces', '2 cups broccoli florets', '1 red bell pepper, sliced', '2 tbsp soy sauce', '1 tbsp honey', '1 tsp ginger, minced', '2 tbsp vegetable oil', 'Cooked white rice for serving']::text[],
  ARRAY['chicken', 'quick', 'dinner', 'chinese', 'high-protein']::text[],
  ARRAY['In a small bowl, whisk together soy sauce, honey, and ginger.', 'Heat oil in a large skillet or wok over medium-high heat.', 'Add chicken and cook until browned and cooked through, about 5 to 7 minutes. Remove chicken from pan.', 'Add broccoli and bell pepper to the same pan. Stir-fry for 4 to 5 minutes until tender-crisp.', 'Return chicken to the pan and pour the sauce over the mixture.', 'Toss everything together for 1 to 2 minutes until heated through and the sauce lightly thickens. Serve over rice.']::text[],
  'community-seed',
  'https://www.delish.com/cooking/recipe-ideas/a21235122/easy-chicken-stir-fry-recipe/',
  'Munch',
  'Chinese',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.delish.com/cooking/recipe-ideas/a21235122/easy-chicken-stir-fry-recipe/","original_chef":"Delish"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Easy Chicken Stir-Fry')
     or (
       'https://www.delish.com/cooking/recipe-ideas/a21235122/easy-chicken-stir-fry-recipe/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.delish.com/cooking/recipe-ideas/a21235122/easy-chicken-stir-fry-recipe/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Classic Guacamole',
  'https://images.immediate.co.uk/production/volatile/sites/30/2020/08/guacamole-0776d49.jpg',
  '10 min',
  'Beginner',
  ARRAY['3 ripe avocados', '1/2 small onion, finely diced', '2 roma tomatoes, diced', '1/4 cup fresh cilantro, chopped', '1 jalapeno, seeded and minced', '2 tbsp lime juice', '1/2 tsp salt']::text[],
  ARRAY['snack', 'mexican', 'vegetarian', 'vegan', 'quick', 'gluten-free']::text[],
  ARRAY['In a medium bowl, mash the avocado flesh with a fork until it reaches your desired consistency.', 'Stir in the onion, tomatoes, cilantro, and jalapeno.', 'Add the lime juice and salt. Mix well.', 'Taste and adjust seasoning if needed. Serve immediately with tortilla chips.']::text[],
  'community-seed',
  'https://www.bbcgoodfood.com/recipes/best-ever-guacamole',
  'Munch',
  'Mexican',
  6,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.bbcgoodfood.com/recipes/best-ever-guacamole","original_chef":"BBC Good Food"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Classic Guacamole')
     or (
       'https://www.bbcgoodfood.com/recipes/best-ever-guacamole' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.bbcgoodfood.com/recipes/best-ever-guacamole')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Quick Beef Tacos',
  'https://hips.hearstapps.com/hmg-prod/images/beef-tacos-index-6490899f24683.jpg',
  '15 min',
  'Beginner',
  ARRAY['1 lb ground beef', '1 packet taco seasoning', '8 hard taco shells', '1 cup shredded lettuce', '1 cup shredded cheddar cheese', '1/2 cup sour cream', '1/4 cup salsa']::text[],
  ARRAY['beef', 'dinner', 'quick', 'mexican', 'budget']::text[],
  ARRAY['In a large skillet, brown the ground beef over medium-high heat until no longer pink. Drain excess fat.', 'Stir in the taco seasoning and the amount of water called for on the package. Simmer for 5 minutes.', 'Warm the taco shells according to package directions.', 'Fill each shell with the seasoned beef.', 'Top with lettuce, cheese, sour cream, and salsa.']::text[],
  'community-seed',
  'https://www.foodnetwork.com/recipes/food-network-kitchen/quick-beef-tacos-recipe-1941910',
  'Munch',
  'Mexican',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.foodnetwork.com/recipes/food-network-kitchen/quick-beef-tacos-recipe-1941910","original_chef":"Food Network"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Quick Beef Tacos')
     or (
       'https://www.foodnetwork.com/recipes/food-network-kitchen/quick-beef-tacos-recipe-1941910' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.foodnetwork.com/recipes/food-network-kitchen/quick-beef-tacos-recipe-1941910')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Margherita Pizza',
  'https://cookieandkate.com/images/2021/07/margherita-pizza-recipe.jpg',
  '15 min',
  'Intermediate',
  ARRAY['1 ball pizza dough', '1/2 cup pizza sauce', '8 oz fresh mozzarella, sliced', '1/4 cup fresh basil leaves', '1 tbsp olive oil', 'Salt to taste']::text[],
  ARRAY['vegetarian', 'dinner', 'italian', 'pizza']::text[],
  ARRAY['Preheat oven to 500°F (260°C). If using a pizza stone, place it in the oven while preheating.', 'Roll out dough on a floured surface into a 12-inch circle.', 'Spread pizza sauce evenly over the dough, leaving a small border for the crust.', 'Arrange mozzarella slices over the sauce.', 'Bake for 10 to 12 minutes until the crust is golden and the cheese is bubbly.', 'Remove from oven, top with fresh basil, drizzle with olive oil, and sprinkle with salt.']::text[],
  'community-seed',
  'https://cookieandkate.com/margherita-pizza-recipe/',
  'Munch',
  'Italian',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://cookieandkate.com/margherita-pizza-recipe/","original_chef":"Cookie and Kate"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Margherita Pizza')
     or (
       'https://cookieandkate.com/margherita-pizza-recipe/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://cookieandkate.com/margherita-pizza-recipe/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Red Lentil Dal',
  'https://www.veganricha.com/wp-content/uploads/2019/01/Instant-Pot-Red-Lentil-Dal-veganricha-0968.jpg',
  '30 min',
  'Beginner',
  ARRAY['1 cup red lentils, rinsed', '3 cups water', '1 onion, diced', '2 cloves garlic, minced', '1 tsp turmeric', '1 tsp cumin seeds', '1/2 tsp chili powder', '1 tbsp vegetable oil', 'Salt to taste']::text[],
  ARRAY['vegetarian', 'vegan', 'indian', 'high-protein', 'budget', 'dinner']::text[],
  ARRAY['In a medium pot, combine lentils, water, and turmeric. Bring to a boil, then simmer for 15 to 20 minutes until soft.', 'In a small skillet, heat oil over medium heat. Add cumin seeds and let them sizzle for 30 seconds.', 'Add onions and cook until translucent. Add garlic and chili powder, cooking for another minute.', 'Stir the onion mixture into the cooked lentils. Season with salt.', 'Simmer for another 5 minutes to allow flavors to meld. Serve with rice or naan.']::text[],
  'community-seed',
  'https://www.veganricha.com/red-lentil-dal-recipe/',
  'Munch',
  'Indian',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.veganricha.com/red-lentil-dal-recipe/","original_chef":"Vegan Richa"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Red Lentil Dal')
     or (
       'https://www.veganricha.com/red-lentil-dal-recipe/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.veganricha.com/red-lentil-dal-recipe/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Greek Salad',
  'https://www.loveandlemons.com/wp-content/uploads/2019/07/greek-salad-2.jpg',
  '15 min',
  'Beginner',
  ARRAY['2 large cucumbers, chopped', '4 roma tomatoes, chopped', '1/2 red onion, thinly sliced', '1/2 cup kalamata olives', '1/2 cup crumbled feta cheese', '1/4 cup olive oil', '2 tbsp red wine vinegar', '1 tsp dried oregano']::text[],
  ARRAY['salad', 'vegetarian', 'mediterranean', 'quick', 'lunch']::text[],
  ARRAY['In a large bowl, combine cucumbers, tomatoes, red onion, and olives.', 'In a small jar or bowl, whisk together olive oil, red wine vinegar, and oregano.', 'Pour the dressing over the vegetables and toss gently to coat.', 'Top with crumbled feta cheese before serving.']::text[],
  'community-seed',
  'https://www.loveandlemons.com/greek-salad-recipe/',
  'Munch',
  'Greek',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.loveandlemons.com/greek-salad-recipe/","original_chef":"Love and Lemons"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Greek Salad')
     or (
       'https://www.loveandlemons.com/greek-salad-recipe/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.loveandlemons.com/greek-salad-recipe/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Lemon Garlic Butter Salmon',
  'https://cafedelites.com/wp-content/uploads/2018/03/Lemon-Garlic-Butter-Pan-Seared-Salmon-Pan-Seared-Salmon-4.jpg',
  '15 min',
  'Beginner',
  ARRAY['2 salmon fillets', '2 tbsp butter', '2 cloves garlic, minced', '1 tbsp lemon juice', '1 tsp lemon zest', 'Salt and pepper to taste', 'Fresh parsley for garnish']::text[],
  ARRAY['seafood', 'quick', 'dinner', 'high-protein', 'mediterranean']::text[],
  ARRAY['Season salmon fillets with salt and pepper on both sides.', 'Melt butter in a large skillet over medium-high heat. Add garlic and cook for 30 seconds until fragrant.', 'Place salmon in the skillet, skin-side up. Sear for 4 to 5 minutes until golden brown.', 'Flip the salmon and cook for another 3 to 4 minutes until cooked through.', 'Stir in lemon juice and zest, spooning the sauce over the salmon. Garnish with parsley.']::text[],
  'community-seed',
  'https://cafedelites.com/lemon-garlic-butter-pan-seared-salmon/',
  'Munch',
  'Mediterranean',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://cafedelites.com/lemon-garlic-butter-pan-seared-salmon/","original_chef":"Cafe Delites"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Lemon Garlic Butter Salmon')
     or (
       'https://cafedelites.com/lemon-garlic-butter-pan-seared-salmon/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://cafedelites.com/lemon-garlic-butter-pan-seared-salmon/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Classic Hummus',
  'https://www.gimmesomeoven.com/wp-content/uploads/2015/05/Hummus-Recipe-1.jpg',
  '10 min',
  'Beginner',
  ARRAY['1 can (15 oz) chickpeas, drained and rinsed', '1/4 cup tahini', '1/4 cup lemon juice', '1 small clove garlic, minced', '2 tbsp olive oil', '1/2 tsp ground cumin', '2 to 3 tbsp water']::text[],
  ARRAY['snack', 'mediterranean', 'vegan', 'vegetarian', 'gluten-free', 'quick']::text[],
  ARRAY['In a food processor, combine chickpeas, tahini, lemon juice, garlic, olive oil, and cumin.', 'Process until smooth, scraping down the sides as needed.', 'While the processor is running, add water 1 tablespoon at a time until you reach a creamy consistency.', 'Transfer to a bowl and drizzle with extra olive oil if desired.']::text[],
  'community-seed',
  'https://www.gimmesomeoven.com/classic-hummus-recipe/',
  'Munch',
  'Middle Eastern',
  8,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.gimmesomeoven.com/classic-hummus-recipe/","original_chef":"Gimme Some Oven"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Classic Hummus')
     or (
       'https://www.gimmesomeoven.com/classic-hummus-recipe/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.gimmesomeoven.com/classic-hummus-recipe/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Avocado Toast with Egg',
  'https://www.simplyrecipes.com/thmb/h49lM3X9v-Zl7_m05V7f8-r6_4w=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/__opt__aboutcom__76__simplyrecipes__all-verticals__images__2019__05__Avocado-Toast-with-Egg-LEAD-03-7521c8b3e83b4b5e8e8e8e8e8e8e.jpg',
  '10 min',
  'Beginner',
  ARRAY['2 slices whole grain bread', '1 ripe avocado', '2 large eggs', '1 tsp red pepper flakes', 'Salt and pepper to taste', '1 tsp lemon juice']::text[],
  ARRAY['breakfast', 'quick', 'vegetarian', 'high-protein']::text[],
  ARRAY['Toast the bread slices until golden and crisp.', 'In a small bowl, mash the avocado with lemon juice, salt, and pepper.', 'Cook eggs your preferred way.', 'Spread the mashed avocado onto the toast slices.', 'Top with the cooked eggs and red pepper flakes.']::text[],
  'community-seed',
  'https://www.simplyrecipes.com/recipes/avocado_toast_with_egg/',
  'Munch',
  'American',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.simplyrecipes.com/recipes/avocado_toast_with_egg/","original_chef":"Simply Recipes"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Avocado Toast with Egg')
     or (
       'https://www.simplyrecipes.com/recipes/avocado_toast_with_egg/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.simplyrecipes.com/recipes/avocado_toast_with_egg/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Vegetarian Pad Thai',
  'https://hot-thai-kitchen.com/wp-content/uploads/2014/11/Pad-Thai-Updated-1-1.jpg',
  '30 min',
  'Intermediate',
  ARRAY['8 oz rice noodles', '2 tbsp vegetable oil', '1/2 cup firm tofu, cubed', '2 large eggs, lightly beaten', '1/4 cup peanuts, crushed', '2 cups bean sprouts', '3 green onions, sliced', '3 tbsp soy sauce', '2 tbsp brown sugar', '1 tbsp lime juice', '1 tsp chili flakes']::text[],
  ARRAY['thai', 'vegetarian', 'dinner', 'noodles', 'quick']::text[],
  ARRAY['Soak rice noodles in warm water for 20 to 30 minutes until soft but still firm. Drain.', 'In a small bowl, whisk together soy sauce, brown sugar, lime juice, and chili flakes.', 'Heat oil in a large wok or skillet. Add tofu and cook until browned.', 'Push tofu to the side and add eggs. Scramble until just set.', 'Add noodles and sauce. Toss for 2 to 3 minutes until noodles are coated and tender.', 'Stir in bean sprouts, green onions, and peanuts. Cook for 1 more minute and serve with lime wedges.']::text[],
  'community-seed',
  'https://hot-thai-kitchen.com/vegetarian-pad-thai/',
  'Munch',
  'Thai',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://hot-thai-kitchen.com/vegetarian-pad-thai/","original_chef":"Pailin''s Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Vegetarian Pad Thai')
     or (
       'https://hot-thai-kitchen.com/vegetarian-pad-thai/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://hot-thai-kitchen.com/vegetarian-pad-thai/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'One-Pot Pasta with Spinach and Tomatoes',
  'https://www.marthastewart.com/thmb/25925000/one-pot-pasta-103072237.jpg',
  '20 min',
  'Beginner',
  ARRAY['12 oz linguine', '1 can (15 oz) diced tomatoes', '1 large onion, thinly sliced', '4 cloves garlic, thinly sliced', '1/2 tsp red pepper flakes', '2 tsp dried oregano', '2 tbsp olive oil', '4 cups vegetable broth', '2 cups fresh spinach', '1/4 cup grated Parmesan cheese']::text[],
  ARRAY['pasta', 'vegetarian', 'one-pot', 'dinner', 'quick', 'budget']::text[],
  ARRAY['In a large straight-sided skillet or pot, combine linguine, tomatoes, onion, garlic, pepper flakes, oregano, olive oil, and broth.', 'Bring to a boil over high heat.', 'Reduce heat and simmer, stirring frequently, until the liquid is nearly evaporated and the pasta is tender, about 9 to 11 minutes.', 'Stir in the spinach until wilted.', 'Serve with Parmesan cheese and a drizzle of olive oil.']::text[],
  'community-seed',
  'https://www.marthastewart.com/978784/one-pot-pasta-recipe',
  'Munch',
  'Italian',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.marthastewart.com/978784/one-pot-pasta-recipe","original_chef":"Martha Stewart"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('One-Pot Pasta with Spinach and Tomatoes')
     or (
       'https://www.marthastewart.com/978784/one-pot-pasta-recipe' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.marthastewart.com/978784/one-pot-pasta-recipe')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Baked Honey Mustard Chicken',
  'https://www.budgetbytes.com/wp-content/uploads/2011/08/Honey-Mustard-Chicken-V3.jpg',
  '40 min',
  'Beginner',
  ARRAY['1.5 lbs chicken thighs, bone-in skin-on', '1/4 cup honey', '1/4 cup Dijon mustard', '1 tbsp olive oil', '1/2 tsp salt', '1/2 tsp black pepper', '1/2 tsp garlic powder']::text[],
  ARRAY['chicken', 'dinner', 'budget', 'high-protein', 'american']::text[],
  ARRAY['Preheat oven to 375°F (190°C).', 'In a small bowl, whisk together honey, mustard, olive oil, salt, pepper, and garlic powder.', 'Place chicken thighs in a baking dish and coat with the honey mustard mixture.', 'Bake for 30 to 35 minutes, or until the chicken reaches an internal temperature of 165°F (74°C).', 'Let rest for 5 minutes before serving.']::text[],
  'community-seed',
  'https://www.budgetbytes.com/honey-mustard-chicken-thighs/',
  'Munch',
  'American',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.budgetbytes.com/honey-mustard-chicken-thighs/","original_chef":"Budget Bytes"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Baked Honey Mustard Chicken')
     or (
       'https://www.budgetbytes.com/honey-mustard-chicken-thighs/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.budgetbytes.com/honey-mustard-chicken-thighs/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Shakshuka',
  'https://i2.wp.com/downshiftology.com/wp-content/uploads/2018/12/Shakshuka-19.jpg',
  '30 min',
  'Beginner',
  ARRAY['1 tbsp olive oil', '1 onion, diced', '1 red bell pepper, diced', '3 cloves garlic, minced', '2 tsp paprika', '1 tsp cumin', '1/4 tsp chili powder', '1 can (28 oz) whole peeled tomatoes', '6 large eggs', '1/4 cup crumbled feta cheese', '1/4 cup fresh parsley, chopped']::text[],
  ARRAY['breakfast', 'lunch', 'middle-eastern', 'vegetarian', 'one-pot']::text[],
  ARRAY['Heat oil in a large deep skillet over medium heat. Add onion and bell pepper and cook until soft, about 5 minutes.', 'Add garlic and spices and cook for 1 minute.', 'Pour in the tomatoes and break them up with a spoon. Simmer for 15 minutes until the sauce thickens.', 'Use a spoon to make 6 small wells in the sauce and crack an egg into each well.', 'Cover the skillet and cook for 5 to 8 minutes until egg whites are set but yolks are still runny.', 'Garnish with feta and parsley. Serve with crusty bread.']::text[],
  'community-seed',
  'https://downshiftology.com/recipes/shakshuka/',
  'Munch',
  'Middle Eastern',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://downshiftology.com/recipes/shakshuka/","original_chef":"Downshiftology"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Shakshuka')
     or (
       'https://downshiftology.com/recipes/shakshuka/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://downshiftology.com/recipes/shakshuka/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Classic Beef Stew',
  'https://www.onceuponachef.com/images/2011/02/beef-stew-11.jpg',
  '2 hr 30 min',
  'Intermediate',
  ARRAY['2 lbs beef chuck, cut into 1-inch cubes', '1/4 cup all-purpose flour', '2 tbsp olive oil', '1 onion, chopped', '3 carrots, sliced into rounds', '2 stalks celery, sliced', '3 potatoes, cubed', '3 cups beef broth', '1 cup red wine', '2 tbsp tomato paste', '2 cloves garlic, minced', '2 sprigs fresh thyme', '1 bay leaf']::text[],
  ARRAY['beef', 'dinner', 'stew', 'slow-cooked', 'american']::text[],
  ARRAY['Toss beef cubes with flour, salt, and pepper.', 'In a large Dutch oven, heat oil over medium-high heat. Brown beef in batches and set aside.', 'Add onion, carrots, and celery to the pot. Cook for 5 minutes.', 'Add garlic and tomato paste, cooking for 1 minute.', 'Pour in wine to deglaze the pot, scraping up any browned bits.', 'Add beef back to the pot along with broth, potatoes, thyme, and bay leaf.', 'Bring to a boil, then reduce heat to low. Cover and simmer for 1 1/2 to 2 hours until beef is tender.']::text[],
  'community-seed',
  'https://www.onceuponachef.com/recipes/beef-stew-with-carrots-potatoes.html',
  'Munch',
  'American',
  6,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.onceuponachef.com/recipes/beef-stew-with-carrots-potatoes.html","original_chef":"Once Upon a Chef"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Classic Beef Stew')
     or (
       'https://www.onceuponachef.com/recipes/beef-stew-with-carrots-potatoes.html' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.onceuponachef.com/recipes/beef-stew-with-carrots-potatoes.html')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Simple Miso Soup',
  'https://justonecookbook.com/wp-content/uploads/2022/03/Miso-Soup-8032-I.jpg',
  '15 min',
  'Beginner',
  ARRAY['4 cups water', '1 tsp dashi granules', '3 tbsp miso paste', '1/2 cup silken tofu, cubed', '2 green onions, sliced', '1 sheet dried seaweed, sliced']::text[],
  ARRAY['soup', 'japanese', 'quick', 'vegetarian', 'lunch']::text[],
  ARRAY['In a medium saucepan, bring water and dashi granules to a boil.', 'Reduce heat to low.', 'Place miso paste in a small bowl and whisk in a few tablespoons of the warm water until smooth.', 'Add the miso mixture, tofu, seaweed, and green onions to the saucepan.', 'Heat through for 1 to 2 minutes, but do not let the soup boil after the miso is added.']::text[],
  'community-seed',
  'https://www.justonecookbook.com/miso-soup/',
  'Munch',
  'Japanese',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.justonecookbook.com/miso-soup/","original_chef":"Just One Cookbook"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Simple Miso Soup')
     or (
       'https://www.justonecookbook.com/miso-soup/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.justonecookbook.com/miso-soup/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Blueberry Smoothie',
  'https://cookieandkate.com/images/2019/01/blueberry-smoothie-recipe-1.jpg',
  '5 min',
  'Beginner',
  ARRAY['1 cup frozen blueberries', '1 ripe banana', '1 cup milk (dairy or non-dairy)', '1/2 cup Greek yogurt', '1 tbsp honey or maple syrup', '1/2 tsp vanilla extract']::text[],
  ARRAY['breakfast', 'snack', 'quick', 'vegetarian', 'gluten-free']::text[],
  ARRAY['Place all ingredients into a high-speed blender.', 'Blend on high until smooth and creamy.', 'Pour into a glass and serve immediately.']::text[],
  'community-seed',
  'https://cookieandkate.com/favorite-blueberry-smoothie-recipe/',
  'Munch',
  'American',
  1,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://cookieandkate.com/favorite-blueberry-smoothie-recipe/","original_chef":"Cookie and Kate"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Blueberry Smoothie')
     or (
       'https://cookieandkate.com/favorite-blueberry-smoothie-recipe/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://cookieandkate.com/favorite-blueberry-smoothie-recipe/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Caprese Salad',
  'https://www.thepioneerwoman.com/wp-content/uploads/2014/06/caprese-salad.jpg',
  '10 min',
  'Beginner',
  ARRAY['3 large tomatoes, sliced', '8 oz fresh mozzarella, sliced', '1/2 cup fresh basil leaves', '2 tbsp extra virgin olive oil', '1 tbsp balsamic glaze', 'Salt and pepper to taste']::text[],
  ARRAY['salad', 'italian', 'vegetarian', 'quick', 'lunch']::text[],
  ARRAY['Alternate slices of tomato and mozzarella on a large platter.', 'Tuck fresh basil leaves between the slices.', 'Drizzle with olive oil and balsamic glaze.', 'Season with salt and pepper to taste.']::text[],
  'community-seed',
  'https://www.thepioneerwoman.com/food-cooking/recipes/a10344/caprese-salad/',
  'Munch',
  'Italian',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.thepioneerwoman.com/food-cooking/recipes/a10344/caprese-salad/","original_chef":"The Pioneer Woman"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Caprese Salad')
     or (
       'https://www.thepioneerwoman.com/food-cooking/recipes/a10344/caprese-salad/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.thepioneerwoman.com/food-cooking/recipes/a10344/caprese-salad/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Korean Beef Bulgogi',
  'https://mykoreankitchen.com/wp-content/uploads/2015/12/Bulgogi-Korean-BBQ-Beef.jpg',
  '20 min',
  'Intermediate',
  ARRAY['1 lb flank steak, thinly sliced against the grain', '1/4 cup soy sauce', '2 tbsp brown sugar', '1 tbsp sesame oil', '3 cloves garlic, minced', '1 tsp ginger, minced', '1/2 pear, grated', '2 green onions, sliced', '1 tbsp sesame seeds']::text[],
  ARRAY['beef', 'korean', 'dinner', 'high-protein']::text[],
  ARRAY['In a large bowl, whisk together soy sauce, sugar, sesame oil, garlic, ginger, and grated pear.', 'Add the sliced beef to the marinade and toss to coat. Refrigerate for at least 30 minutes.', 'Heat a large skillet or grill pan over high heat.', 'Add the beef in a single layer, cooking in batches if needed, and cook for 2 to 3 minutes per side until caramelized and cooked through.', 'Garnish with green onions and sesame seeds. Serve with rice and lettuce wraps.']::text[],
  'community-seed',
  'https://mykoreankitchen.com/bulgogi-korean-bbq-beef/',
  'Munch',
  'Korean',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://mykoreankitchen.com/bulgogi-korean-bbq-beef/","original_chef":"My Korean Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Korean Beef Bulgogi')
     or (
       'https://mykoreankitchen.com/bulgogi-korean-bbq-beef/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://mykoreankitchen.com/bulgogi-korean-bbq-beef/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Creamy Mushroom Risotto',
  'https://www.seriouseats.com/thmb/9-Z4V9v-Zl7_m05V7f8-r6_4w=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20230302-Mushroom-Risotto-Vicky-Wasik-33-3d7521c8b3e83b4b5e8e8e8e8e8e8e8e.jpg',
  '45 min',
  'Intermediate',
  ARRAY['1.5 cups arborio rice', '1 lb mushrooms (cremini or shiitake), sliced', '4 cups chicken or vegetable broth, kept warm', '1/2 cup dry white wine', '2 shallots, finely diced', '3 tbsp butter', '1/2 cup grated Parmesan cheese', '2 tbsp olive oil', '2 cloves garlic, minced', 'Salt and pepper to taste']::text[],
  ARRAY['rice', 'italian', 'vegetarian', 'dinner']::text[],
  ARRAY['Heat olive oil in a large skillet. Sauté mushrooms until browned and the liquid has evaporated. Remove from pan and set aside.', 'In the same pan, melt 1 tablespoon butter. Add shallots and cook until soft.', 'Add rice and toast for 2 minutes, stirring constantly.', 'Pour in the wine and stir until absorbed.', 'Add the warm broth one ladle at a time, stirring frequently and waiting for the liquid to absorb before adding the next ladle.', 'Continue until rice is tender but still slightly firm, about 20 minutes.', 'Stir in the cooked mushrooms, remaining butter, Parmesan, and garlic. Season with salt and pepper.']::text[],
  'community-seed',
  'https://www.seriouseats.com/mushrom-risotto-recipe',
  'Munch',
  'Italian',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.seriouseats.com/mushrom-risotto-recipe","original_chef":"Serious Eats"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Creamy Mushroom Risotto')
     or (
       'https://www.seriouseats.com/mushrom-risotto-recipe' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.seriouseats.com/mushrom-risotto-recipe')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Classic French Omelette',
  'https://www.thespruceeats.com/thmb/h49lM3X9v-Zl7_m05V7f8-r6_4w=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/French-Omelette-5c1a7521c8b3e83b4b5e8e8e8e8e8e8e.jpg',
  '10 min',
  'Intermediate',
  ARRAY['3 large eggs', '1 tbsp unsalted butter', '1 tsp finely chopped chives', 'Pinch of salt', 'Pinch of white pepper']::text[],
  ARRAY['breakfast', 'french', 'vegetarian', 'quick', 'high-protein']::text[],
  ARRAY['Whisk eggs vigorously in a bowl until no streaks of white remain. Season with salt and pepper.', 'Melt butter in an 8-inch non-stick skillet over medium-low heat until foamy but not browned.', 'Add eggs to the pan. Use a rubber spatula to stir the eggs in a circular motion while shaking the pan.', 'When the eggs are mostly set but still slightly moist on top, smooth them into an even layer.', 'Roll the omelette tightly and slide it onto a plate, seam-side down.', 'Rub the top with a bit of butter and sprinkle with chives.']::text[],
  'community-seed',
  'https://www.thespruceeats.com/classic-french-omelet-recipe-1375519',
  'Munch',
  'French',
  1,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.thespruceeats.com/classic-french-omelet-recipe-1375519","original_chef":"The Spruce Eats"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Classic French Omelette')
     or (
       'https://www.thespruceeats.com/classic-french-omelet-recipe-1375519' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.thespruceeats.com/classic-french-omelet-recipe-1375519')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Couscous with Roasted Vegetables',
  'https://www.aheadofthyme.com/wp-content/uploads/2021/04/roasted-vegetable-couscous.jpg',
  '35 min',
  'Beginner',
  ARRAY['1 cup couscous', '1 cup boiling water', '1 zucchini, diced', '1 red bell pepper, diced', '1 small red onion, cut into wedges', '2 tbsp olive oil', '1/2 cup chickpeas, rinsed', '1/4 cup fresh parsley, chopped', '1 tbsp lemon juice', 'Salt and pepper to taste']::text[],
  ARRAY['vegetarian', 'vegan', 'mediterranean', 'lunch', 'dinner', 'quick']::text[],
  ARRAY['Preheat oven to 400°F (200°C).', 'Toss zucchini, bell pepper, and onion with olive oil, salt, and pepper on a baking sheet.', 'Roast for 20 to 25 minutes until tender and slightly charred.', 'While the vegetables roast, place couscous in a large bowl and pour boiling water over it. Cover and let sit for 5 minutes.', 'Fluff couscous with a fork. Stir in the roasted vegetables, chickpeas, parsley, and lemon juice.', 'Serve warm or at room temperature.']::text[],
  'community-seed',
  'https://www.aheadofthyme.com/roasted-vegetable-couscous/',
  'Munch',
  'Mediterranean',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.aheadofthyme.com/roasted-vegetable-couscous/","original_chef":"Ahead of Thyme"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Couscous with Roasted Vegetables')
     or (
       'https://www.aheadofthyme.com/roasted-vegetable-couscous/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.aheadofthyme.com/roasted-vegetable-couscous/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Easy Banana Pancakes',
  'https://www.allrecipes.com/thmb/h49lM3X9v-Zl7_m05V7f8-r6_4w=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/20344-banana-pancakes-mfs-43-7521c8b3e83b4b5e8e8e8e8e8e8e8e.jpg',
  '20 min',
  'Beginner',
  ARRAY['1 cup all-purpose flour', '1 tbsp sugar', '2 tsp baking powder', '1/4 tsp salt', '1 ripe banana, mashed', '1 egg', '1 cup milk', '2 tbsp vegetable oil']::text[],
  ARRAY['breakfast', 'vegetarian', 'quick', 'budget', 'american']::text[],
  ARRAY['In a large bowl, whisk together flour, sugar, baking powder, and salt.', 'In another bowl, mix the mashed banana, egg, milk, and oil.', 'Pour the wet ingredients into the dry ingredients and stir until just combined.', 'Heat a lightly oiled griddle or frying pan over medium-high heat.', 'Pour 1/4 cup of batter for each pancake onto the griddle. Brown on both sides and serve hot with syrup.']::text[],
  'community-seed',
  'https://www.allrecipes.com/recipe/20344/banana-pancakes-i/',
  'Munch',
  'American',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.allrecipes.com/recipe/20344/banana-pancakes-i/","original_chef":"AllRecipes"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Easy Banana Pancakes')
     or (
       'https://www.allrecipes.com/recipe/20344/banana-pancakes-i/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.allrecipes.com/recipe/20344/banana-pancakes-i/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Vietnamese Spring Rolls',
  'https://www.recipetineats.com/wp-content/uploads/2017/05/Vietnamese-Rice-Paper-Rolls-3.jpg',
  '30 min',
  'Intermediate',
  ARRAY['8 rice paper wrappers', '1/2 lb shrimp, cooked and halved lengthwise', '2 oz rice vermicelli noodles, cooked', '1 cup lettuce, shredded', '1/2 cup carrots, julienned', '1/2 cup cucumber, julienned', '1/4 cup fresh mint leaves', '1/4 cup fresh cilantro', 'Peanut sauce for dipping']::text[],
  ARRAY['snack', 'vietnamese', 'quick', 'lunch', 'seafood']::text[],
  ARRAY['Soak one rice paper wrapper in warm water for 5 to 10 seconds until soft.', 'Lay the wrapper flat on a damp surface.', 'Place a few shrimp halves in the center of the wrapper.', 'Top with noodles, lettuce, carrots, cucumber, mint, and cilantro.', 'Fold the bottom of the wrapper over the filling, then fold in the sides and roll up tightly.', 'Repeat with remaining wrappers. Serve with peanut sauce.']::text[],
  'community-seed',
  'https://www.recipetineats.com/vietnamese-rice-paper-rolls-spring-rolls/',
  'Munch',
  'Vietnamese',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.recipetineats.com/vietnamese-rice-paper-rolls-spring-rolls/","original_chef":"RecipeTin Eats"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Vietnamese Spring Rolls')
     or (
       'https://www.recipetineats.com/vietnamese-rice-paper-rolls-spring-rolls/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.recipetineats.com/vietnamese-rice-paper-rolls-spring-rolls/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Lemon Herb Roasted Chicken',
  'https://www.jocooks.com/wp-content/uploads/2019/04/roast-chicken-1.jpg',
  '1 hr 30 min',
  'Intermediate',
  ARRAY['1 whole chicken (approx 4 lbs)', '2 lemons, halved', '1 head garlic, halved crosswise', '3 sprigs fresh rosemary', '3 sprigs fresh thyme', '2 tbsp butter, softened', 'Salt and black pepper to taste']::text[],
  ARRAY['chicken', 'dinner', 'american', 'high-protein']::text[],
  ARRAY['Preheat oven to 425°F (220°C).', 'Remove giblets from chicken and pat the skin dry with paper towels.', 'Stuff the cavity with 1 lemon, the garlic, and the herbs.', 'Rub the butter all over the skin. Season generously with salt and pepper.', 'Tie the legs together with kitchen twine and tuck the wings under the body.', 'Place chicken in a roasting pan and bake for 1 hour to 1 hour 15 minutes, or until the internal temperature reaches 165°F (74°C).', 'Let rest for 15 minutes before carving.']::text[],
  'community-seed',
  'https://www.jocooks.com/recipes/lemon-herb-roasted-chicken/',
  'Munch',
  'American',
  6,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.jocooks.com/recipes/lemon-herb-roasted-chicken/","original_chef":"Jo Cooks"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Lemon Herb Roasted Chicken')
     or (
       'https://www.jocooks.com/recipes/lemon-herb-roasted-chicken/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.jocooks.com/recipes/lemon-herb-roasted-chicken/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Buffalo Chicken Wings',
  'https://www.spendwithpennies.com/wp-content/uploads/2018/09/Air-Fryer-Chicken-Wings-SpendWithPennies-2.jpg',
  '45 min',
  'Beginner',
  ARRAY['2 lbs chicken wings', '1/2 cup Buffalo wing sauce', '1/4 cup melted butter', '1 tsp garlic powder', 'Salt and pepper to taste', 'Blue cheese dressing for serving', 'Celery sticks for serving']::text[],
  ARRAY['snack', 'chicken', 'american', 'high-protein']::text[],
  ARRAY['Preheat oven to 400°F (200°C).', 'Season wings with salt, pepper, and garlic powder. Place them on a wire rack set over a baking sheet.', 'Bake for 35 to 40 minutes, flipping halfway through, until crispy and golden.', 'In a large bowl, whisk together the Buffalo sauce and melted butter.', 'Add the hot wings to the bowl and toss to coat.', 'Serve immediately with blue cheese dressing and celery sticks.']::text[],
  'community-seed',
  'https://www.spendwithpennies.com/buffalo-chicken-wings/',
  'Munch',
  'American',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.spendwithpennies.com/buffalo-chicken-wings/","original_chef":"Spend with Pennies"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Buffalo Chicken Wings')
     or (
       'https://www.spendwithpennies.com/buffalo-chicken-wings/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.spendwithpennies.com/buffalo-chicken-wings/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Garlic Shrimp Scampi',
  'https://www.allrecipes.com/thmb/h49lM3X9v-Zl7_m05V7f8-r6_4w=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/229960-shrimp-scampi-with-pasta-mfs-043-7521c8b3e83b4b5e8e8e8e8e8e8e8e.jpg',
  '15 min',
  'Beginner',
  ARRAY['1 lb large shrimp, peeled and deveined', '8 oz linguine', '3 tbsp butter', '2 tbsp olive oil', '4 cloves garlic, minced', '1/4 cup dry white wine', '1 tbsp lemon juice', '1/4 cup fresh parsley, chopped', '1/4 tsp red pepper flakes']::text[],
  ARRAY['seafood', 'pasta', 'quick', 'dinner', 'italian']::text[],
  ARRAY['Cook pasta in a large pot of salted water until al dente. Drain.', 'In a large skillet, heat olive oil and 1 tablespoon butter over medium heat.', 'Add shrimp and cook for 2 minutes per side until pink. Remove from skillet.', 'Add remaining butter and garlic to the skillet. Cook for 1 minute.', 'Stir in white wine, lemon juice, and red pepper flakes. Simmer for 2 minutes.', 'Return shrimp to the skillet and add the cooked pasta and parsley. Toss to combine and serve.']::text[],
  'community-seed',
  'https://www.allrecipes.com/recipe/229960/shrimp-scampi-with-pasta/',
  'Munch',
  'Italian',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.allrecipes.com/recipe/229960/shrimp-scampi-with-pasta/","original_chef":"AllRecipes"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Garlic Shrimp Scampi')
     or (
       'https://www.allrecipes.com/recipe/229960/shrimp-scampi-with-pasta/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.allrecipes.com/recipe/229960/shrimp-scampi-with-pasta/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Turkey Chili',
  'https://www.ambitiouskitchen.com/wp-content/uploads/2015/11/best-turkey-chili-recipe-5.jpg',
  '45 min',
  'Beginner',
  ARRAY['1 lb ground turkey', '1 onion, chopped', '1 bell pepper, chopped', '2 cloves garlic, minced', '1 can (15 oz) kidney beans, drained', '1 can (28 oz) crushed tomatoes', '2 tbsp chili powder', '1 tsp cumin', '1/2 tsp salt', '1 tbsp olive oil']::text[],
  ARRAY['dinner', 'high-protein', 'budget', 'one-pot', 'american']::text[],
  ARRAY['Heat oil in a large pot over medium heat. Add onion and bell pepper and cook until soft.', 'Add ground turkey and cook until browned, breaking it up with a spoon.', 'Stir in garlic, chili powder, and cumin. Cook for 1 minute.', 'Add tomatoes and kidney beans. Bring to a boil.', 'Reduce heat and simmer for 30 minutes, stirring occasionally.', 'Serve warm with optional toppings like cheese or sour cream.']::text[],
  'community-seed',
  'https://www.ambitiouskitchen.com/the-best-healthy-turkey-chili-recipe/',
  'Munch',
  'American',
  6,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.ambitiouskitchen.com/the-best-healthy-turkey-chili-recipe/","original_chef":"Ambitious Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Turkey Chili')
     or (
       'https://www.ambitiouskitchen.com/the-best-healthy-turkey-chili-recipe/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.ambitiouskitchen.com/the-best-healthy-turkey-chili-recipe/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Vegetable Fried Rice',
  'https://www.gimmesomeoven.com/wp-content/uploads/2014/03/Fried-Rice-Recipe-1.jpg',
  '15 min',
  'Beginner',
  ARRAY['3 cups cooked jasmine rice, chilled', '2 tbsp vegetable oil', '1/2 cup frozen peas and carrots', '2 eggs, lightly beaten', '3 green onions, sliced', '3 tbsp soy sauce', '1 tsp sesame oil', '1/2 tsp garlic powder']::text[],
  ARRAY['rice', 'quick', 'vegetarian', 'dinner', 'budget', 'chinese']::text[],
  ARRAY['Heat 1 tablespoon oil in a large skillet or wok over medium-high heat.', 'Add eggs and scramble until just set. Remove from pan.', 'Add remaining oil and the frozen peas and carrots. Sauté for 2 to 3 minutes.', 'Add the chilled rice and break up any clumps.', 'Stir in soy sauce, sesame oil, and garlic powder. Cook for 3 to 4 minutes until heated through.', 'Add the cooked eggs and green onions. Toss to combine and serve.']::text[],
  'community-seed',
  'https://www.gimmesomeoven.com/fried-rice-recipe/',
  'Munch',
  'Chinese',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.gimmesomeoven.com/fried-rice-recipe/","original_chef":"Gimme Some Oven"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Vegetable Fried Rice')
     or (
       'https://www.gimmesomeoven.com/fried-rice-recipe/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.gimmesomeoven.com/fried-rice-recipe/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Chicken Quesadillas',
  'https://www.simplyrecipes.com/thmb/h49lM3X9v-Zl7_m05V7f8-r6_4w=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/Simply-Recipes-Chicken-Quesadillas-LEAD-3-7521c8b3e83b4b5e8e8e8e8e8e8e8e.jpg',
  '20 min',
  'Beginner',
  ARRAY['2 cups cooked chicken, shredded', '4 large flour tortillas', '2 cups shredded Mexican cheese blend', '1/4 cup chopped cilantro', '1 tbsp butter', 'Salsa and sour cream for serving']::text[],
  ARRAY['chicken', 'mexican', 'quick', 'dinner', 'lunch']::text[],
  ARRAY['Place two tortillas on a flat surface. Divide the cheese, chicken, and cilantro evenly between them.', 'Top with the remaining tortillas.', 'Melt half the butter in a large skillet over medium heat.', 'Place one quesadilla in the skillet and cook for 3 to 4 minutes until the bottom is golden brown.', 'Flip and cook for another 2 to 3 minutes until the cheese is melted and the other side is golden. Repeat with the second quesadilla.', 'Cut into wedges and serve with salsa and sour cream.']::text[],
  'community-seed',
  'https://www.simplyrecipes.com/recipes/chicken_quesadillas/',
  'Munch',
  'Mexican',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.simplyrecipes.com/recipes/chicken_quesadillas/","original_chef":"Simply Recipes"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Chicken Quesadillas')
     or (
       'https://www.simplyrecipes.com/recipes/chicken_quesadillas/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.simplyrecipes.com/recipes/chicken_quesadillas/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Caesar Salad',
  'https://natashaskitchen.com/wp-content/uploads/2019/01/Caesar-Salad-Recipe-3.jpg',
  '15 min',
  'Beginner',
  ARRAY['1 large head romaine lettuce, chopped', '1/2 cup Caesar dressing', '1/2 cup croutons', '1/4 cup shaved Parmesan cheese', '1/4 tsp black pepper', 'Optional: grilled chicken breast']::text[],
  ARRAY['salad', 'vegetarian', 'quick', 'lunch', 'american']::text[],
  ARRAY['In a large bowl, toss the chopped romaine lettuce with Caesar dressing until evenly coated.', 'Add croutons and Parmesan cheese.', 'Season with black pepper.', 'If using, top with sliced grilled chicken breast.', 'Serve immediately.']::text[],
  'community-seed',
  'https://natashaskitchen.com/caesar-salad-recipe/',
  'Munch',
  'American',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://natashaskitchen.com/caesar-salad-recipe/","original_chef":"Natasha''s Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Caesar Salad')
     or (
       'https://natashaskitchen.com/caesar-salad-recipe/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://natashaskitchen.com/caesar-salad-recipe/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'French Toast',
  'https://www.marthastewart.com/thmb/h49lM3X9v-Zl7_m05V7f8-r6_4w=/1500x0/filters:no_upscale():max_bytes(150000):strip_icc()/french-toast-103072237.jpg',
  '15 min',
  'Beginner',
  ARRAY['4 slices thick bread (brioche or challah)', '2 large eggs', '1/2 cup milk', '1 tsp vanilla extract', '1/2 tsp ground cinnamon', '1 tbsp butter', 'Maple syrup for serving']::text[],
  ARRAY['breakfast', 'vegetarian', 'quick', 'american']::text[],
  ARRAY['In a shallow bowl, whisk together eggs, milk, vanilla, and cinnamon.', 'Heat butter in a large skillet over medium heat.', 'Dip each slice of bread into the egg mixture for about 10 seconds per side.', 'Place the soaked bread into the skillet and cook for 3 to 4 minutes per side until golden brown.', 'Serve hot with maple syrup and fresh berries if desired.']::text[],
  'community-seed',
  'https://www.marthastewart.com/332731/easy-french-toast',
  'Munch',
  'American',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.marthastewart.com/332731/easy-french-toast","original_chef":"Martha Stewart"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('French Toast')
     or (
       'https://www.marthastewart.com/332731/easy-french-toast' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.marthastewart.com/332731/easy-french-toast')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Beef and Broccoli',
  'https://www.justonecookbook.com/wp-content/uploads/2019/04/Beef-and-Broccoli-8032-I.jpg',
  '20 min',
  'Beginner',
  ARRAY['1 lb flank steak, thinly sliced', '3 cups broccoli florets', '1/4 cup soy sauce', '2 tbsp oyster sauce', '1 tbsp brown sugar', '1 tbsp cornstarch', '2 tbsp vegetable oil', '2 cloves garlic, minced']::text[],
  ARRAY['beef', 'chinese', 'quick', 'dinner', 'high-protein']::text[],
  ARRAY['In a small bowl, whisk together soy sauce, oyster sauce, brown sugar, and cornstarch.', 'Heat 1 tablespoon oil in a large skillet over high heat. Add beef and cook until browned. Remove beef.', 'Add remaining oil and broccoli to the pan with 2 tablespoons water. Cover and steam for 2 minutes.', 'Remove cover, add garlic, and sauté for 30 seconds.', 'Return beef to the pan and pour in the sauce.', 'Toss everything together until the sauce thickens and coats the beef and broccoli. Serve with rice.']::text[],
  'community-seed',
  'https://www.justonecookbook.com/beef-and-broccoli/',
  'Munch',
  'Chinese',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.justonecookbook.com/beef-and-broccoli/","original_chef":"Just One Cookbook"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Beef and Broccoli')
     or (
       'https://www.justonecookbook.com/beef-and-broccoli/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.justonecookbook.com/beef-and-broccoli/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Classic Beef Burgers',
  'https://www.foodnetwork.com/recipes/food-network-kitchen/classic-beef-burgers-recipe-1941910',
  '15 min',
  'Beginner',
  ARRAY['1 lb ground beef (80/20 mix)', '4 hamburger buns', '4 slices cheddar cheese', '1/2 tsp salt', '1/2 tsp black pepper', 'Lettuce, tomato, and onion for topping', '1 tbsp butter']::text[],
  ARRAY['beef', 'american', 'dinner', 'quick', 'high-protein']::text[],
  ARRAY['Divide the beef into 4 equal portions and shape into patties about 1/2-inch thick. Season both sides with salt and pepper.', 'Heat a large skillet or grill over medium-high heat.', 'Cook patties for 3 to 4 minutes per side for medium-rare.', 'Place a slice of cheese on each patty during the last minute of cooking and cover to melt.', 'Lightly toast the buns with butter in another pan.', 'Assemble burgers with lettuce, tomato, and onion.']::text[],
  'community-seed',
  'https://www.foodnetwork.com/recipes/food-network-kitchen/classic-beef-burgers-recipe-2105731',
  'Munch',
  'American',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.foodnetwork.com/recipes/food-network-kitchen/classic-beef-burgers-recipe-2105731","original_chef":"Food Network"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Classic Beef Burgers')
     or (
       'https://www.foodnetwork.com/recipes/food-network-kitchen/classic-beef-burgers-recipe-2105731' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.foodnetwork.com/recipes/food-network-kitchen/classic-beef-burgers-recipe-2105731')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Ratatouille',
  'https://www.onceuponachef.com/images/2011/02/ratatouille-11.jpg',
  '50 min',
  'Intermediate',
  ARRAY['1 eggplant, diced', '2 zucchini, diced', '1 onion, diced', '1 yellow bell pepper, diced', '3 tomatoes, chopped', '3 tbsp olive oil', '2 cloves garlic, minced', '1 tsp dried herbes de Provence', 'Salt and pepper to taste']::text[],
  ARRAY['vegetarian', 'vegan', 'french', 'dinner', 'gluten-free']::text[],
  ARRAY['Heat 2 tablespoons oil in a large pot over medium heat. Add eggplant and zucchini and cook until browned and soft. Remove and set aside.', 'Add remaining oil, onion, and bell pepper to the pot. Cook until soft.', 'Stir in garlic and herbes de Provence. Cook for 1 minute.', 'Add tomatoes and return the eggplant and zucchini to the pot.', 'Season with salt and pepper. Cover and simmer over low heat for 30 to 40 minutes until the vegetables are very tender.']::text[],
  'community-seed',
  'https://www.onceuponachef.com/recipes/ratatouille.html',
  'Munch',
  'French',
  6,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.onceuponachef.com/recipes/ratatouille.html","original_chef":"Once Upon a Chef"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Ratatouille')
     or (
       'https://www.onceuponachef.com/recipes/ratatouille.html' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.onceuponachef.com/recipes/ratatouille.html')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Penne alla Vodka',
  'https://www.delish.com/penne-alla-vodka-horizontal.jpg',
  '25 min',
  'Beginner',
  ARRAY['1 lb penne pasta', '1 tbsp olive oil', '2 cloves garlic, minced', '1/2 cup vodka', '1 can (28 oz) crushed tomatoes', '1/2 cup heavy cream', '1/2 cup grated Parmesan cheese', '1/4 tsp red pepper flakes']::text[],
  ARRAY['pasta', 'italian', 'vegetarian', 'dinner', 'quick']::text[],
  ARRAY['Boil a large pot of salted water and cook penne until al dente.', 'In a large skillet, heat oil and garlic over medium heat for 1 minute.', 'Pour in the vodka and simmer until reduced by half.', 'Stir in the crushed tomatoes and red pepper flakes. Simmer for 10 minutes.', 'Lower the heat and stir in the heavy cream and Parmesan cheese.', 'Toss the cooked pasta with the sauce and serve immediately.']::text[],
  'community-seed',
  'https://www.delish.com/cooking/recipe-ideas/a26848133/penne-alla-vodka-recipe/',
  'Munch',
  'Italian',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"https://www.delish.com/cooking/recipe-ideas/a26848133/penne-alla-vodka-recipe/","original_chef":"Delish"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Penne alla Vodka')
     or (
       'https://www.delish.com/cooking/recipe-ideas/a26848133/penne-alla-vodka-recipe/' is not null
       and lower(coalesce(existing.source_url, '')) = lower('https://www.delish.com/cooking/recipe-ideas/a26848133/penne-alla-vodka-recipe/')
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Scrambled Eggs',
  NULL,
  '10 min',
  'Beginner',
  ARRAY['4 large eggs', '2 tbsp milk', '1 tbsp butter', '1/4 tsp salt', '1/8 tsp black pepper']::text[],
  ARRAY['breakfast', 'quick', 'budget', 'high-protein']::text[],
  ARRAY['Crack eggs into a bowl and whisk with milk, salt, and pepper.', 'Melt butter in a nonstick pan over medium heat.', 'Pour in the eggs and gently stir with a spatula.', 'Cook until softly set and creamy.', 'Serve immediately.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Scrambled Eggs')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Classic Grilled Cheese Sandwich',
  NULL,
  '10 min',
  'Beginner',
  ARRAY['2 slices bread', '2 slices cheddar cheese', '1 tbsp butter']::text[],
  ARRAY['lunch', 'quick', 'budget', 'vegetarian']::text[],
  ARRAY['Heat a skillet over medium heat.', 'Butter one side of each bread slice.', 'Place one slice butter-side down in the skillet and top with cheese.', 'Add the second slice of bread butter-side up.', 'Cook until golden brown on both sides and the cheese is melted.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  1,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Classic Grilled Cheese Sandwich')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Garlic Butter Pasta',
  NULL,
  '20 min',
  'Beginner',
  ARRAY['8 oz spaghetti', '3 tbsp butter', '3 cloves garlic minced', '1/4 tsp salt', '2 tbsp grated parmesan', '1 tbsp chopped parsley']::text[],
  ARRAY['dinner', 'pasta', 'vegetarian', 'quick']::text[],
  ARRAY['Cook spaghetti in salted water until al dente.', 'Melt butter in a pan and saute the garlic until fragrant.', 'Drain pasta and add it to the pan.', 'Toss with salt, parmesan, and parsley.', 'Serve warm.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Italian',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Garlic Butter Pasta')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Simple Chicken Stir Fry',
  NULL,
  '25 min',
  'Beginner',
  ARRAY['1 lb chicken breast sliced', '1 tbsp vegetable oil', '1 cup broccoli florets', '1 carrot sliced', '2 tbsp soy sauce', '1 tsp sesame oil', '1 tsp garlic minced']::text[],
  ARRAY['dinner', 'chicken', 'quick', 'high-protein']::text[],
  ARRAY['Heat oil in a wok or skillet.', 'Add chicken and cook until browned.', 'Add vegetables and stir-fry for 3 to 4 minutes.', 'Stir in soy sauce, sesame oil, and garlic.', 'Cook another minute and serve.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Chinese',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Simple Chicken Stir Fry')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Avocado Toast',
  NULL,
  '5 min',
  'Beginner',
  ARRAY['2 slices bread', '1 ripe avocado', '1/4 tsp salt', '1 tbsp lemon juice', '1 tbsp olive oil']::text[],
  ARRAY['breakfast', 'quick', 'vegetarian', 'budget']::text[],
  ARRAY['Toast the bread slices.', 'Mash the avocado with lemon juice and salt.', 'Spread the mixture on the toast.', 'Drizzle with olive oil and serve.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Avocado Toast')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Classic Tomato Soup',
  NULL,
  '30 min',
  'Beginner',
  ARRAY['1 tbsp olive oil', '1 onion diced', '2 cloves garlic minced', '28 oz canned tomatoes', '1 cup vegetable broth', '1/2 tsp salt', '1/4 tsp pepper']::text[],
  ARRAY['soup', 'vegetarian', 'dinner', 'budget']::text[],
  ARRAY['Heat oil in a pot and saute the onion until soft.', 'Add garlic and cook briefly.', 'Add tomatoes and broth.', 'Simmer for 20 minutes.', 'Blend until smooth and season to taste.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Classic Tomato Soup')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Simple Greek Salad',
  NULL,
  '10 min',
  'Beginner',
  ARRAY['2 cups chopped tomatoes', '1 cucumber sliced', '1/4 cup red onion', '1/4 cup feta cheese', '1 tbsp olive oil', '1 tsp lemon juice', '1/4 tsp oregano']::text[],
  ARRAY['salad', 'vegetarian', 'quick', 'lunch']::text[],
  ARRAY['Combine tomatoes, cucumber, and onion in a bowl.', 'Add feta cheese.', 'Drizzle with olive oil and lemon juice.', 'Sprinkle oregano and toss gently.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Greek',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Simple Greek Salad')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Pan Seared Salmon',
  NULL,
  '15 min',
  'Beginner',
  ARRAY['2 salmon fillets', '1 tbsp olive oil', '1/4 tsp salt', '1/4 tsp pepper', '1 tsp lemon juice']::text[],
  ARRAY['seafood', 'dinner', 'high-protein', 'quick']::text[],
  ARRAY['Season salmon with salt and pepper.', 'Heat oil in a skillet over medium-high heat.', 'Cook salmon skin-side down for 4 to 5 minutes.', 'Flip and cook another 3 minutes.', 'Drizzle with lemon juice and serve.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Pan Seared Salmon')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Chicken Quesadilla',
  NULL,
  '15 min',
  'Beginner',
  ARRAY['1 cup cooked chicken shredded', '2 flour tortillas', '1/2 cup shredded cheese', '1 tbsp butter', '2 tbsp salsa']::text[],
  ARRAY['lunch', 'chicken', 'quick', 'mexican']::text[],
  ARRAY['Heat a skillet over medium heat.', 'Place one tortilla in the pan and add chicken and cheese.', 'Top with the second tortilla.', 'Cook until the cheese melts and the tortilla browns.', 'Slice and serve with salsa.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Mexican',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Chicken Quesadilla')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Oatmeal with Honey and Berries',
  NULL,
  '10 min',
  'Beginner',
  ARRAY['1 cup rolled oats', '2 cups water', '1 tbsp honey', '1/2 cup mixed berries', '1 pinch salt']::text[],
  ARRAY['breakfast', 'quick', 'vegetarian', 'budget']::text[],
  ARRAY['Bring water and salt to a boil.', 'Stir in oats and cook for 5 minutes.', 'Top with berries and honey.', 'Serve warm.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Oatmeal with Honey and Berries')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Beef Taco Skillet',
  NULL,
  '25 min',
  'Beginner',
  ARRAY['1 lb ground beef', '1 tbsp olive oil', '1/2 onion diced', '1 tbsp taco seasoning', '1 cup canned beans', '1/2 cup shredded cheese']::text[],
  ARRAY['beef', 'dinner', 'mexican', 'one-pot']::text[],
  ARRAY['Heat oil and cook the onion until soft.', 'Add ground beef and brown it.', 'Stir in taco seasoning and beans.', 'Cook for 5 minutes.', 'Top with cheese and serve.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Mexican',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Beef Taco Skillet')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Chicken Noodle Soup',
  NULL,
  '40 min',
  'Beginner',
  ARRAY['1 tbsp olive oil', '1 onion diced', '2 carrots sliced', '2 celery stalks sliced', '6 cups chicken broth', '1 cup shredded chicken', '1 cup egg noodles', '1/2 tsp salt']::text[],
  ARRAY['soup', 'chicken', 'dinner', 'comfort']::text[],
  ARRAY['Heat oil and saute the onion, carrot, and celery.', 'Add broth and bring to a boil.', 'Add noodles and cook until tender.', 'Stir in chicken.', 'Season and serve.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  4,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Chicken Noodle Soup')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Peanut Butter Banana Smoothie',
  NULL,
  '5 min',
  'Beginner',
  ARRAY['1 banana', '2 tbsp peanut butter', '1 cup milk', '1 tsp honey', '1/2 cup ice']::text[],
  ARRAY['drink', 'breakfast', 'quick', 'high-protein']::text[],
  ARRAY['Add all ingredients to a blender.', 'Blend until smooth.', 'Serve immediately.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  1,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Peanut Butter Banana Smoothie')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Simple Veggie Omelet',
  NULL,
  '10 min',
  'Beginner',
  ARRAY['3 eggs', '1 tbsp milk', '1/4 cup bell pepper diced', '2 tbsp onion diced', '1 tbsp butter', '1/4 tsp salt']::text[],
  ARRAY['breakfast', 'vegetarian', 'quick', 'high-protein']::text[],
  ARRAY['Whisk eggs with milk and salt.', 'Melt butter in a skillet.', 'Cook the vegetables briefly.', 'Pour in the eggs and cook until set.', 'Fold the omelet and serve.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'French',
  1,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Simple Veggie Omelet')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Spaghetti Marinara',
  NULL,
  '30 min',
  'Beginner',
  ARRAY['8 oz spaghetti', '2 cups marinara sauce', '1 tbsp olive oil', '2 tbsp parmesan cheese', '1 tsp basil']::text[],
  ARRAY['pasta', 'dinner', 'vegetarian', 'italian']::text[],
  ARRAY['Cook spaghetti according to package directions.', 'Heat marinara sauce in a pan.', 'Drain pasta and combine with sauce.', 'Top with parmesan and basil.', 'Serve hot.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Italian',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Spaghetti Marinara')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Cucumber Yogurt Dip',
  NULL,
  '10 min',
  'Beginner',
  ARRAY['1 cup plain yogurt', '1/2 cucumber grated', '1 tbsp lemon juice', '1 clove garlic minced', '1/4 tsp salt']::text[],
  ARRAY['snack', 'vegetarian', 'mediterranean', 'quick']::text[],
  ARRAY['Combine yogurt, cucumber, and garlic in a bowl.', 'Stir in lemon juice and salt.', 'Mix well.', 'Serve chilled.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Mediterranean',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Cucumber Yogurt Dip')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Garlic Roasted Potatoes',
  NULL,
  '35 min',
  'Beginner',
  ARRAY['1 lb potatoes cubed', '2 tbsp olive oil', '2 cloves garlic minced', '1/2 tsp salt', '1/4 tsp pepper']::text[],
  ARRAY['side', 'vegetarian', 'budget', 'dinner']::text[],
  ARRAY['Preheat the oven to 400 F.', 'Toss potatoes with oil, garlic, salt, and pepper.', 'Spread on a baking sheet.', 'Roast for 30 minutes until golden.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Garlic Roasted Potatoes')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Simple Pancakes',
  NULL,
  '20 min',
  'Beginner',
  ARRAY['1 cup flour', '1 tbsp sugar', '1 tsp baking powder', '1 egg', '3/4 cup milk', '1 tbsp butter']::text[],
  ARRAY['breakfast', 'vegetarian', 'budget', 'quick']::text[],
  ARRAY['Mix flour, sugar, and baking powder.', 'Whisk egg and milk in another bowl.', 'Combine wet and dry ingredients.', 'Cook batter on a buttered skillet until golden.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Simple Pancakes')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Chicken Caesar Salad',
  NULL,
  '20 min',
  'Beginner',
  ARRAY['2 cups romaine lettuce chopped', '1 grilled chicken breast sliced', '1/4 cup croutons', '2 tbsp Caesar dressing', '2 tbsp grated parmesan']::text[],
  ARRAY['salad', 'chicken', 'lunch', 'high-protein']::text[],
  ARRAY['Place chopped romaine in a bowl.', 'Add sliced grilled chicken and croutons.', 'Drizzle with Caesar dressing.', 'Sprinkle parmesan and toss gently.', 'Serve immediately.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Chicken Caesar Salad')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Veggie Breakfast Burrito',
  NULL,
  '15 min',
  'Beginner',
  ARRAY['2 eggs', '1/4 cup black beans', '1/4 cup bell pepper diced', '2 tbsp shredded cheese', '1 flour tortilla', '1 tbsp olive oil']::text[],
  ARRAY['breakfast', 'vegetarian', 'quick', 'high-protein']::text[],
  ARRAY['Heat oil in a skillet and cook bell peppers for 2 minutes.', 'Add eggs and scramble.', 'Warm tortilla in a separate pan.', 'Fill tortilla with eggs, beans, and cheese.', 'Roll burrito and serve.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Mexican',
  1,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Veggie Breakfast Burrito')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Lemon Garlic Shrimp',
  NULL,
  '15 min',
  'Beginner',
  ARRAY['1 lb shrimp peeled', '2 tbsp olive oil', '3 cloves garlic minced', '1 tbsp lemon juice', '1/4 tsp salt', '1 tbsp parsley chopped']::text[],
  ARRAY['seafood', 'dinner', 'quick', 'high-protein']::text[],
  ARRAY['Heat olive oil in a skillet over medium heat.', 'Add garlic and cook briefly.', 'Add shrimp and cook until pink.', 'Stir in lemon juice and salt.', 'Top with parsley and serve.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Mediterranean',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Lemon Garlic Shrimp')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Vegetable Quesadilla',
  NULL,
  '15 min',
  'Beginner',
  ARRAY['2 flour tortillas', '1/2 cup shredded cheese', '1/4 cup bell peppers sliced', '1/4 cup onion sliced', '1 tbsp butter']::text[],
  ARRAY['vegetarian', 'lunch', 'quick', 'mexican']::text[],
  ARRAY['Heat butter in a skillet.', 'Place tortilla in pan and add vegetables and cheese.', 'Top with second tortilla.', 'Cook until golden and cheese melts.', 'Slice and serve.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Mexican',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Vegetable Quesadilla')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Classic BLT Sandwich',
  NULL,
  '10 min',
  'Beginner',
  ARRAY['2 slices bread', '3 bacon strips', '2 lettuce leaves', '2 tomato slices', '1 tbsp mayonnaise']::text[],
  ARRAY['lunch', 'quick', 'american', 'sandwich']::text[],
  ARRAY['Cook bacon until crisp.', 'Toast bread slices.', 'Spread mayonnaise on bread.', 'Layer bacon, lettuce, and tomato.', 'Close sandwich and serve.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  1,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Classic BLT Sandwich')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Garlic Butter Green Beans',
  NULL,
  '15 min',
  'Beginner',
  ARRAY['1 lb green beans trimmed', '1 tbsp butter', '2 cloves garlic minced', '1/4 tsp salt', '1/4 tsp pepper']::text[],
  ARRAY['side', 'vegetarian', 'quick', 'budget']::text[],
  ARRAY['Bring a pot of water to boil and blanch green beans for 3 minutes.', 'Drain beans.', 'Melt butter in a skillet and saute garlic.', 'Add beans and toss with salt and pepper.', 'Cook 3 minutes and serve.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Garlic Butter Green Beans')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Honey Soy Chicken',
  NULL,
  '25 min',
  'Beginner',
  ARRAY['1 lb chicken thighs', '2 tbsp soy sauce', '1 tbsp honey', '1 tsp garlic minced', '1 tbsp vegetable oil']::text[],
  ARRAY['chicken', 'dinner', 'quick', 'high-protein']::text[],
  ARRAY['Heat oil in a skillet.', 'Add chicken and cook until browned.', 'Mix soy sauce, honey, and garlic.', 'Pour sauce over chicken and simmer 10 minutes.', 'Serve hot.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Asian',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Honey Soy Chicken')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Simple Fruit Salad',
  NULL,
  '10 min',
  'Beginner',
  ARRAY['1 cup strawberries sliced', '1 cup grapes halved', '1 apple diced', '1 banana sliced', '1 tbsp honey']::text[],
  ARRAY['snack', 'vegetarian', 'quick', 'healthy']::text[],
  ARRAY['Combine fruit in a bowl.', 'Drizzle with honey.', 'Toss gently.', 'Serve chilled.']::text[],
  'community-seed',
  NULL,
  'Munch',
  NULL,
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Simple Fruit Salad')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Baked Lemon Chicken',
  NULL,
  '40 min',
  'Beginner',
  ARRAY['2 chicken breasts', '2 tbsp olive oil', '1 tbsp lemon juice', '1 tsp garlic powder', '1/2 tsp salt', '1/4 tsp pepper']::text[],
  ARRAY['chicken', 'dinner', 'high-protein', 'oven']::text[],
  ARRAY['Preheat oven to 375 F.', 'Place chicken in a baking dish.', 'Drizzle with oil and lemon juice.', 'Season with garlic powder, salt, and pepper.', 'Bake 30 minutes until cooked through.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Baked Lemon Chicken')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Egg Fried Rice',
  NULL,
  '20 min',
  'Beginner',
  ARRAY['2 cups cooked rice', '2 eggs', '1 tbsp vegetable oil', '2 tbsp soy sauce', '1/4 cup peas', '1 green onion sliced']::text[],
  ARRAY['rice', 'dinner', 'quick', 'budget']::text[],
  ARRAY['Heat oil in a wok.', 'Scramble eggs and set aside.', 'Cook peas briefly.', 'Add rice and soy sauce and stir-fry.', 'Mix eggs back in and garnish with green onion.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Chinese',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Egg Fried Rice')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Tuna Salad Sandwich',
  NULL,
  '10 min',
  'Beginner',
  ARRAY['1 can tuna drained', '2 tbsp mayonnaise', '1 tbsp celery diced', '1/4 tsp salt', '2 slices bread']::text[],
  ARRAY['lunch', 'quick', 'seafood', 'high-protein']::text[],
  ARRAY['Mix tuna, mayonnaise, celery, and salt.', 'Toast bread if desired.', 'Spread tuna mixture on bread.', 'Close sandwich and serve.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  1,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Tuna Salad Sandwich')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Garlic Butter Shrimp Pasta',
  NULL,
  '25 min',
  'Intermediate',
  ARRAY['8 oz spaghetti', '1 lb shrimp', '2 tbsp butter', '2 cloves garlic minced', '1 tbsp lemon juice', '2 tbsp parsley chopped']::text[],
  ARRAY['pasta', 'seafood', 'dinner', 'quick']::text[],
  ARRAY['Cook spaghetti until al dente.', 'Melt butter in a pan and saute garlic.', 'Add shrimp and cook until pink.', 'Add lemon juice and parsley.', 'Toss with drained pasta and serve.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Italian',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Garlic Butter Shrimp Pasta')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Roasted Carrots with Honey',
  NULL,
  '30 min',
  'Beginner',
  ARRAY['1 lb carrots sliced', '1 tbsp olive oil', '1 tbsp honey', '1/4 tsp salt', '1/4 tsp pepper']::text[],
  ARRAY['side', 'vegetarian', 'budget', 'oven']::text[],
  ARRAY['Preheat oven to 400 F.', 'Toss carrots with oil, honey, salt, and pepper.', 'Spread on a baking sheet.', 'Roast for 25 minutes until tender.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Roasted Carrots with Honey')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Chicken Pasta Salad',
  NULL,
  '25 min',
  'Beginner',
  ARRAY['2 cups cooked pasta', '1 cup cooked chicken diced', '1/4 cup cherry tomatoes', '2 tbsp mayonnaise', '1 tbsp lemon juice']::text[],
  ARRAY['pasta', 'lunch', 'meal-prep', 'chicken']::text[],
  ARRAY['Cook pasta and cool.', 'Combine pasta, chicken, and tomatoes.', 'Mix mayonnaise and lemon juice.', 'Toss everything together.', 'Serve chilled.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Chicken Pasta Salad')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Chocolate Mug Cake',
  NULL,
  '5 min',
  'Beginner',
  ARRAY['4 tbsp flour', '2 tbsp sugar', '1 tbsp cocoa powder', '3 tbsp milk', '1 tbsp oil', '1/4 tsp baking powder']::text[],
  ARRAY['dessert', 'quick', 'vegetarian', 'budget']::text[],
  ARRAY['Mix all ingredients in a mug.', 'Stir until smooth.', 'Microwave for 60 to 90 seconds.', 'Serve warm.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  1,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Chocolate Mug Cake')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Simple Chickpea Salad',
  NULL,
  '10 min',
  'Beginner',
  ARRAY['1 can chickpeas drained', '1/4 cup cucumber diced', '2 tbsp red onion diced', '1 tbsp olive oil', '1 tbsp lemon juice', '1/4 tsp salt']::text[],
  ARRAY['salad', 'vegetarian', 'quick', 'budget']::text[],
  ARRAY['Combine chickpeas, cucumber, and onion in a bowl.', 'Add olive oil and lemon juice.', 'Season with salt.', 'Toss and serve.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Mediterranean',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Simple Chickpea Salad')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Baked Sweet Potato',
  NULL,
  '45 min',
  'Beginner',
  ARRAY['2 sweet potatoes', '1 tbsp butter', '1/4 tsp salt']::text[],
  ARRAY['side', 'vegetarian', 'budget', 'oven']::text[],
  ARRAY['Preheat oven to 400 F.', 'Pierce sweet potatoes with a fork.', 'Bake 40 minutes until tender.', 'Split open and add butter and salt.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Baked Sweet Potato')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Garlic Chicken Rice Bowl',
  NULL,
  '30 min',
  'Beginner',
  ARRAY['1 cup cooked rice', '1 chicken breast diced', '1 tbsp soy sauce', '1 tsp garlic minced', '1 tbsp vegetable oil', '1 green onion sliced']::text[],
  ARRAY['rice', 'chicken', 'dinner', 'high-protein']::text[],
  ARRAY['Heat oil in a skillet.', 'Cook chicken until browned.', 'Add garlic and soy sauce.', 'Serve chicken over rice.', 'Top with green onion.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Asian',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Garlic Chicken Rice Bowl')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Banana Oat Pancakes',
  NULL,
  '15 min',
  'Beginner',
  ARRAY['1 banana', '1/2 cup oats', '1 egg', '1/4 tsp baking powder', '1 tbsp butter']::text[],
  ARRAY['breakfast', 'quick', 'high-protein', 'budget']::text[],
  ARRAY['Blend banana, oats, egg, and baking powder.', 'Heat butter in skillet.', 'Pour batter into small pancakes.', 'Cook until golden on both sides.', 'Serve warm.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'American',
  2,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Banana Oat Pancakes')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

insert into public.recipes (
  name,
  image,
  cook_time,
  difficulty,
  ingredients,
  tags,
  instructions,
  source,
  source_url,
  chef,
  cuisine,
  servings,
  is_public,
  raw_api_payload
)
select
  'Simple Marinara Sauce',
  NULL,
  '30 min',
  'Beginner',
  ARRAY['2 cups crushed tomatoes', '2 tbsp olive oil', '2 cloves garlic minced', '1/2 tsp salt', '1 tsp dried basil']::text[],
  ARRAY['sauce', 'vegetarian', 'italian', 'budget']::text[],
  ARRAY['Heat olive oil in a saucepan.', 'Add garlic and cook briefly.', 'Add crushed tomatoes, salt, and basil.', 'Simmer 20 minutes.', 'Serve with pasta.']::text[],
  'community-seed',
  NULL,
  'Munch',
  'Italian',
  3,
  true,
  '{"seed_source":"community-seed-master.cleaned.jsonl","source_brand":"Munch","original_source_url":"","original_chef":"Munch Kitchen"}'::jsonb
where not exists (
  select 1
  from public.recipes existing
  where lower(existing.name) = lower('Simple Marinara Sauce')
     or (
       NULL is not null
       and lower(coalesce(existing.source_url, '')) = lower(NULL)
     )
);

commit;
